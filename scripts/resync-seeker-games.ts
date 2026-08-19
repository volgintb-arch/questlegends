// One-off ресинк: прогоняет emitGamesWebhook по всем GameLead в стадиях
// scheduled/completed. Нужно после того, как формат venue поменялся,
// activationCode добавился, или после бага, из-за которого seeker получил
// неполные payload'ы.
//
// Запуск на сервере:
//   cd /var/www/questlegends
//   export $(grep -E '^(DATABASE_URL|CRM_WEBHOOK_SECRET|SEEKER_PASSPORT_URL)=' .env | xargs)
//   pnpm exec tsx scripts/resync-seeker-games.ts
//
// Скрипт inline'ит логику эмиттера (postgres/HMAC/fetch/composeGamesPayload),
// чтобы не тянуть Next.js runtime и path-алиасы @/lib/*. Дрейф с
// lib/seeker-webhook-emitter.ts проверять глазами при правке payload-формата.

import postgres from "postgres"
import { createHmac } from "crypto"

const DATABASE_URL = process.env.DATABASE_URL
const CRM_WEBHOOK_SECRET = process.env.CRM_WEBHOOK_SECRET
const SEEKER_PASSPORT_URL = process.env.SEEKER_PASSPORT_URL

if (!DATABASE_URL) throw new Error("DATABASE_URL is not set")
if (!CRM_WEBHOOK_SECRET) throw new Error("CRM_WEBHOOK_SECRET is not set")
if (!SEEKER_PASSPORT_URL) throw new Error("SEEKER_PASSPORT_URL is not set")

const CITY_OFFSET_MINUTES: Record<string, number> = {
  barnaul: 7 * 60,
  omsk: 6 * 60,
}
const DEFAULT_OFFSET_MINUTES = 7 * 60

function toIsoWithOffset(date: Date, offsetMin: number): string {
  const sign = offsetMin >= 0 ? "+" : "-"
  const abs = Math.abs(offsetMin)
  const hh = String(Math.floor(abs / 60)).padStart(2, "0")
  const mm = String(abs % 60).padStart(2, "0")
  const shifted = new Date(date.getTime() + offsetMin * 60_000)
  return `${shifted.toISOString().slice(0, 19)}${sign}${hh}:${mm}`
}

function computeStartEnd(
  gameDate: string | null,
  gameTime: string | null,
  durationHours: number,
  offsetMin: number,
): { startsAt: string | null; endsAt: string | null } {
  if (!gameDate || !gameTime) return { startsAt: null, endsAt: null }
  const asUtcMs = Date.parse(`${gameDate}T${gameTime}:00Z`)
  if (Number.isNaN(asUtcMs)) return { startsAt: null, endsAt: null }
  const startUtcMs = asUtcMs - offsetMin * 60_000
  const endUtcMs = startUtcMs + (durationHours || 3) * 3_600_000
  return {
    startsAt: toIsoWithOffset(new Date(startUtcMs), offsetMin),
    endsAt: toIsoWithOffset(new Date(endUtcMs), offsetMin),
  }
}

function composeGamesPayload(row: any) {
  const citySlug: string | null = row.citySlug ?? null
  const offsetMin = citySlug ? CITY_OFFSET_MINUTES[citySlug] ?? DEFAULT_OFFSET_MINUTES : DEFAULT_OFFSET_MINUTES
  const { startsAt, endsAt } = computeStartEnd(
    row.gameDate,
    row.gameTime,
    Number(row.gameDuration) || 3,
    offsetMin,
  )
  return {
    leadId: row.id,
    citySlug,
    venue: row.franchiseeName ?? null,
    startsAt,
    endsAt,
    kidsCount: Number(row.playersCount) || 0,
    groupType: row.groupType ?? null,
    birthdayChildName: row.birthdayChildName ?? null,
    schoolName: row.schoolName ?? null,
    schoolClass: row.schoolClass ?? null,
    hostName: row.hostName ?? null,
    adminName: row.adminName ?? null,
    reelUrl: row.reelUrl ?? null,
    reelReadyAt: row.reelReadyAt ? new Date(row.reelReadyAt).toISOString() : null,
    status: row.stageType === "cancelled" ? "CANCELLED" : "CONFIRMED",
    activationCode: row.activationCode ?? null,
  }
}

function signWebhook(body: string, secret: string): string {
  const hex = createHmac("sha256", secret).update(body, "utf8").digest("hex")
  return `sha256=${hex}`
}

async function main() {
  const sql = postgres(DATABASE_URL!, { onnotice: () => {} })

  const rows = await sql`
    SELECT
      gl.id, gl."gameDate", gl."gameTime", gl."gameDuration", gl."playersCount",
      gl."venueName", gl."groupType", gl."birthdayChildName",
      gl."schoolName", gl."schoolClass", gl."hostName", gl."adminName",
      gl."reelUrl", gl."reelReadyAt", gl."activationCode",
      s."stageType",
      f."citySlug", f.name AS "franchiseeName", f.city AS "franchiseeCity", f.address AS "franchiseeAddress"
    FROM "GameLead" gl
    LEFT JOIN "GamePipelineStage" s ON s.id = gl."stageId"
    LEFT JOIN "Franchisee" f ON f.id = gl."franchiseeId"
    WHERE s."stageType" IN ('scheduled', 'completed')
    ORDER BY gl."createdAt" ASC
  `

  console.log(`Найдено лидов на ресинк: ${rows.length}`)
  if (rows.length === 0) {
    await sql.end()
    return
  }

  const targetUrl = `${SEEKER_PASSPORT_URL}/api/crm/games`
  const BASE_DELAY_MS = 2500 // seeker крутит ~30 req/min → ~2000ms + запас
  const MAX_429_RETRIES = 3
  let ok = 0
  let failed = 0
  const failures: { leadId: string; status: number | string; snippet: string }[] = []
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const payload = composeGamesPayload(row)
    const body = JSON.stringify(payload)
    const signature = signWebhook(body, CRM_WEBHOOK_SECRET!)
    const idx = String(i + 1).padStart(String(rows.length).length, " ")

    let attempts = 0
    let sent = false
    let lastStatus: number | string = "no-attempts"
    let lastSnippet = ""

    while (attempts <= MAX_429_RETRIES && !sent) {
      attempts++
      try {
        const res = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Signature-256": signature,
          },
          body,
          signal: AbortSignal.timeout(15_000),
        })

        if (res.ok) {
          ok++
          sent = true
          console.log(
            `[${idx}/${rows.length}] ✓ ${row.id.slice(0, 8)} venue="${payload.venue ?? "—"}" code=${payload.activationCode ?? "—"} status=${payload.status}`,
          )
        } else if (res.status === 429 && attempts <= MAX_429_RETRIES) {
          // Парсим "Rate limit exceeded, retry in N seconds"
          const text = (await res.text().catch(() => "")).slice(0, 300)
          const m = text.match(/retry in (\d+)\s*seconds?/i)
          const retryInSec = m ? Math.min(Number(m[1]), 90) : 30
          const waitMs = (retryInSec + 1) * 1000
          console.log(
            `[${idx}/${rows.length}] ⏳ ${row.id.slice(0, 8)} 429, жду ${retryInSec + 1}с (попытка ${attempts}/${MAX_429_RETRIES + 1})`,
          )
          await sleep(waitMs)
          lastStatus = 429
          lastSnippet = text
        } else {
          lastStatus = res.status
          lastSnippet = (await res.text().catch(() => "")).slice(0, 200)
          break
        }
      } catch (err: any) {
        lastStatus = "exception"
        lastSnippet = String(err?.message ?? err)
        break
      }
    }

    if (!sent) {
      failed++
      failures.push({ leadId: row.id, status: lastStatus, snippet: lastSnippet })
      console.log(`[${idx}/${rows.length}] ✗ ${row.id.slice(0, 8)} [${lastStatus}] ${lastSnippet}`)
    }

    // Steady-state pace между разными лидами — под лимит seeker'а.
    await sleep(BASE_DELAY_MS)
  }

  console.log("")
  console.log(`Итог: ${ok} ok, ${failed} failed из ${rows.length}`)
  if (failures.length > 0) {
    console.log("Провалы:")
    for (const f of failures) {
      console.log(`  ${f.leadId} [${f.status}] ${f.snippet}`)
    }
  }

  await sql.end()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
