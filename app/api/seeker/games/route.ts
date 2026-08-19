import { type NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { sql } from "@/lib/db"
import { composeGamesPayload } from "@/lib/seeker-webhook-emitter"

// GET /api/seeker/games?from=YYYY-MM-DD&to=YYYY-MM-DD[&citySlug=barnaul]
// Fallback-эндпоинт для seeker'ского крон-опроса раз в 15 минут — подстраховка
// на случай потерянного `games`-вебхука. Отдаёт тот же payload, что и
// вебхук, но массивом.
// Auth: Bearer <SEEKER_JWT_SECRET>. Простой shared secret, не JWT.

function safeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function isValidDateString(v: unknown): v is string {
  if (typeof v !== "string") return false
  // Разрешаем YYYY-MM-DD и полный ISO. Всё что дальше — доверяем ::date каста.
  return /^\d{4}-\d{2}-\d{2}/.test(v)
}

export async function GET(req: NextRequest) {
  const secret = process.env.SEEKER_JWT_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const auth = req.headers.get("authorization") || ""
  const expected = `Bearer ${secret}`
  if (!safeEqualStrings(auth, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const citySlug = searchParams.get("citySlug")

  if (!isValidDateString(from) || !isValidDateString(to)) {
    return NextResponse.json(
      { error: "Missing or invalid query params: from, to (YYYY-MM-DD)" },
      { status: 400 },
    )
  }

  const rows = citySlug
    ? await sql`
        SELECT
          gl.id, gl."gameDate", gl."gameTime", gl."gameDuration", gl."playersCount",
          gl."venueName", gl."groupType", gl."birthdayChildName",
          gl."schoolName", gl."schoolClass", gl."hostName", gl."adminName",
          gl."reelUrl", gl."reelReadyAt",
          s."stageType",
          f."citySlug", f.name AS "franchiseeName", f.city AS "franchiseeCity", f.address AS "franchiseeAddress"
        FROM "GameLead" gl
        LEFT JOIN "GamePipelineStage" s ON s.id = gl."stageId"
        LEFT JOIN "Franchisee" f ON f.id = gl."franchiseeId"
        WHERE gl."gameDate" IS NOT NULL
          AND gl."gameDate" >= ${from}
          AND gl."gameDate" <= ${to}
          AND f."citySlug" = ${citySlug}
        ORDER BY gl."gameDate" ASC, gl."gameTime" ASC
      `
    : await sql`
        SELECT
          gl.id, gl."gameDate", gl."gameTime", gl."gameDuration", gl."playersCount",
          gl."venueName", gl."groupType", gl."birthdayChildName",
          gl."schoolName", gl."schoolClass", gl."hostName", gl."adminName",
          gl."reelUrl", gl."reelReadyAt",
          s."stageType",
          f."citySlug", f.name AS "franchiseeName", f.city AS "franchiseeCity", f.address AS "franchiseeAddress"
        FROM "GameLead" gl
        LEFT JOIN "GamePipelineStage" s ON s.id = gl."stageId"
        LEFT JOIN "Franchisee" f ON f.id = gl."franchiseeId"
        WHERE gl."gameDate" IS NOT NULL
          AND gl."gameDate" >= ${from}
          AND gl."gameDate" <= ${to}
        ORDER BY gl."gameDate" ASC, gl."gameTime" ASC
      `

  return NextResponse.json({
    games: rows.map(composeGamesPayload),
    count: rows.length,
  })
}
