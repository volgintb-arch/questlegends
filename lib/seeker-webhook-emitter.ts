import { sql } from "@/lib/db"
import { logApp } from "@/lib/app-logger"
import { signWebhook } from "@/lib/webhook-signing"

// Часовые пояса городов первой волны seeker'а.
// При добавлении города — расширить + citySlug в БД Franchisee.
const CITY_OFFSET_MINUTES: Record<string, number> = {
  barnaul: 7 * 60,
  omsk: 6 * 60,
}
const DEFAULT_OFFSET_MINUTES = 7 * 60 // Barnaul

function toIsoWithOffset(date: Date, offsetMin: number): string {
  const sign = offsetMin >= 0 ? "+" : "-"
  const abs = Math.abs(offsetMin)
  const hh = String(Math.floor(abs / 60)).padStart(2, "0")
  const mm = String(abs % 60).padStart(2, "0")
  const shifted = new Date(date.getTime() + offsetMin * 60_000)
  return `${shifted.toISOString().slice(0, 19)}${sign}${hh}:${mm}`
}

// gameDate ('YYYY-MM-DD') + gameTime ('HH:MM') интерпретируем как ЛОКАЛЬНОЕ
// время города и конвертируем в UTC, чтобы потом отдать с корректным offset.
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

export type GameWebhookPayload = {
  leadId: string
  citySlug: string | null
  venue: string | null
  startsAt: string | null
  endsAt: string | null
  kidsCount: number
  groupType: string | null
  birthdayChildName: string | null
  schoolName: string | null
  schoolClass: string | null
  hostName: string | null
  adminName: string | null
  reelUrl: string | null
  reelReadyAt: string | null
  status: "CONFIRMED" | "CANCELLED"
  activationCode: string | null // D-011
}

export function composeGamesPayload(row: any): GameWebhookPayload {
  const citySlug: string | null = row.citySlug ?? null
  const offsetMin = citySlug ? CITY_OFFSET_MINUTES[citySlug] ?? DEFAULT_OFFSET_MINUTES : DEFAULT_OFFSET_MINUTES
  const { startsAt, endsAt } = computeStartEnd(
    row.gameDate,
    row.gameTime,
    Number(row.gameDuration) || 3,
    offsetMin,
  )
  const venue: string | null =
    row.venueName ||
    [row.franchiseeCity, row.franchiseeAddress].filter(Boolean).join(", ") ||
    null

  return {
    leadId: row.id,
    citySlug,
    venue,
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

// Один запрос собирает всё, что нужно для composeGamesPayload — используется
// и в эмиттере, и в GET /api/seeker/games (fallback крон).
export async function fetchLeadForWebhook(leadId: string): Promise<any | null> {
  const [row] = await sql`
    SELECT
      gl.id, gl."gameDate", gl."gameTime", gl."gameDuration", gl."playersCount",
      gl."venueName", gl."groupType", gl."birthdayChildName",
      gl."schoolName", gl."schoolClass", gl."hostName", gl."adminName",
      gl."reelUrl", gl."reelReadyAt", gl."activationCode",
      s."stageType",
      f."citySlug", f.city AS "franchiseeCity", f.address AS "franchiseeAddress"
    FROM "GameLead" gl
    LEFT JOIN "GamePipelineStage" s ON s.id = gl."stageId"
    LEFT JOIN "Franchisee" f ON f.id = gl."franchiseeId"
    WHERE gl.id = ${leadId}
  `
  return row ?? null
}

async function post(url: string, body: string, signature: string): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature-256": signature,
    },
    body,
    // Cap на случай если seeker завис — не блокируем API-response надолго.
    // Всё, что не долетело за 10 секунд, догонит seeker крон-опросом.
    signal: AbortSignal.timeout(10_000),
  })
}

export async function emitGamesWebhook(leadId: string): Promise<void> {
  const secret = process.env.CRM_WEBHOOK_SECRET
  const baseUrl = process.env.SEEKER_PASSPORT_URL
  if (!secret || !baseUrl) return

  try {
    const row = await fetchLeadForWebhook(leadId)
    if (!row) return
    const payload = composeGamesPayload(row)
    const body = JSON.stringify(payload)
    const signature = signWebhook(body, secret)
    const res = await post(`${baseUrl}/api/crm/games`, body, signature)
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      await logApp({
        level: "error",
        source: "webhook",
        message: `seeker/games emit failed: HTTP ${res.status}`,
        statusCode: res.status,
        metadata: { leadId, responseSnippet: text.slice(0, 500) },
      })
    }
  } catch (err: any) {
    await logApp({
      level: "error",
      source: "webhook",
      message: "seeker/games emit exception",
      stack: err?.stack ?? null,
      metadata: { leadId, error: String(err?.message ?? err) },
    })
  }
}

export async function emitBookingWebhook(leadId: string, refCode: string): Promise<void> {
  const secret = process.env.CRM_WEBHOOK_SECRET
  const baseUrl = process.env.SEEKER_PASSPORT_URL
  if (!secret || !baseUrl) return

  try {
    const body = JSON.stringify({ leadId, refCode, bookedAt: new Date().toISOString() })
    const signature = signWebhook(body, secret)
    const res = await post(`${baseUrl}/api/crm/booking`, body, signature)
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      await logApp({
        level: "error",
        source: "webhook",
        message: `seeker/booking emit failed: HTTP ${res.status}`,
        statusCode: res.status,
        metadata: { leadId, refCode, responseSnippet: text.slice(0, 500) },
      })
    }
  } catch (err: any) {
    await logApp({
      level: "error",
      source: "webhook",
      message: "seeker/booking emit exception",
      stack: err?.stack ?? null,
      metadata: { leadId, refCode, error: String(err?.message ?? err) },
    })
  }
}
