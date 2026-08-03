import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyWebhook, WEBHOOK_SIGNATURE_HEADER } from "@/lib/webhook-signing"
import { logApp } from "@/lib/app-logger"

// POST /api/seeker/clients
// Приёмник от seeker-passport после активации QR-монеты.
// Idempotency-Key: {activationId} — при повторе тем же activationId
// клиент/посещение не дублируются.
// См. docs/CRM.md в проекте seeker-passport для полного контракта.

type IncomingBody = {
  source?: string
  gameLeadId: string
  passportId?: string
  passportNumber?: string
  citySlug?: string
  client: {
    phone: string
    email?: string | null
    tgUserId?: string | null
    childName: string
    childBirthdate: string // ISO date "2018-03-14"
    preferredChannel?: string
    consentAt?: string | null
    mediaConsentAt?: string | null
  }
  attendance: {
    role?: "GUEST" | "HOST_PARENT"
    confirmed?: boolean
    activationId: string
  }
  callTaskAt?: string | null
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

function isValidIsoDate(v: unknown): v is string {
  if (typeof v !== "string") return false
  const d = new Date(v)
  return !Number.isNaN(d.getTime())
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRM_WEBHOOK_SECRET
  if (!secret) {
    await logApp({
      level: "error",
      source: "webhook",
      message: "CRM_WEBHOOK_SECRET is not set",
      url: req.url,
      method: "POST",
      statusCode: 500,
    })
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  // ВАЖНО: подпись верифицируем на СЫРОМ body-буфере, JSON.parse — после verify.
  const rawBody = await req.text()
  const signature = req.headers.get(WEBHOOK_SIGNATURE_HEADER)

  if (!verifyWebhook(signature, rawBody, secret)) {
    await logApp({
      level: "warn",
      source: "webhook",
      message: "seeker/clients: invalid HMAC signature",
      url: req.url,
      method: "POST",
      statusCode: 401,
    })
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let body: IncomingBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Валидация обязательных полей — сохраняем контракт из docs/CRM.md.
  if (
    !isNonEmptyString(body?.gameLeadId) ||
    !body.client ||
    !isNonEmptyString(body.client.phone) ||
    !isNonEmptyString(body.client.childName) ||
    !isValidIsoDate(body.client.childBirthdate) ||
    !body.attendance ||
    !isNonEmptyString(body.attendance.activationId)
  ) {
    return NextResponse.json(
      { error: "Missing required fields: gameLeadId, client.{phone,childName,childBirthdate}, attendance.activationId" },
      { status: 400 },
    )
  }

  // Быстрый выход при повторе с тем же activationId — идемпотентность.
  const [existingAttendance] = await sql`
    SELECT id, "clientId" FROM "ClientAttendance"
    WHERE "activationId" = ${body.attendance.activationId}
  `
  if (existingAttendance) {
    return NextResponse.json({
      success: true,
      idempotent: true,
      clientId: existingAttendance.clientId,
      attendanceId: existingAttendance.id,
    })
  }

  // Проверяем что такая заявка есть — иначе некуда крепить посещение.
  const [gameLead] = await sql`
    SELECT id, "franchiseeId" FROM "GameLead" WHERE id = ${body.gameLeadId}
  `
  if (!gameLead) {
    return NextResponse.json(
      { error: `GameLead not found: ${body.gameLeadId}` },
      { status: 409 },
    )
  }

  // franchiseeId по citySlug (fallback — берём franchiseeId самой игры).
  // Явный маппинг по citySlug важен для будущего, когда seeker будет знать
  // про несколько франчайзи в одном городе — сейчас же они совпадают.
  let franchiseeId: string | null = gameLead.franchiseeId ?? null
  if (isNonEmptyString(body.citySlug)) {
    const [byCity] = await sql`
      SELECT id FROM "Franchisee" WHERE "citySlug" = ${body.citySlug} LIMIT 1
    `
    if (byCity) {
      franchiseeId = byCity.id
    } else {
      await logApp({
        level: "warn",
        source: "webhook",
        message: `seeker/clients: citySlug '${body.citySlug}' не найден среди Franchisee.citySlug — fallback к franchiseeId игры`,
        metadata: { citySlug: body.citySlug, gameLeadId: body.gameLeadId },
      })
    }
  }

  // Upsert по phone. COALESCE на всех полях — не затираем то, что заказ
  // прислал пустым (например email мог отсутствовать в этой активации,
  // но был сохранён при прошлой).
  const clientId = crypto.randomUUID()
  const [upserted] = await sql`
    INSERT INTO "Client" (
      id, phone, email, "childName", "childNameNorm", "childBirthdate",
      "tgUserId", "passportNumber", "passportId",
      "consentAt", "mediaConsentAt", source, "callTaskAt",
      "franchiseeId", "createdAt", "updatedAt"
    ) VALUES (
      ${clientId},
      ${body.client.phone},
      ${body.client.email ?? null},
      ${body.client.childName.trim()},
      ${normalizeName(body.client.childName)},
      ${body.client.childBirthdate},
      ${body.client.tgUserId ?? null},
      ${body.passportNumber ?? null},
      ${body.passportId ?? null},
      ${body.client.consentAt ?? null},
      ${body.client.mediaConsentAt ?? null},
      ${body.source ?? "seeker_passport"},
      ${body.callTaskAt ?? null},
      ${franchiseeId},
      NOW(), NOW()
    )
    ON CONFLICT (phone) DO UPDATE SET
      email            = COALESCE(EXCLUDED.email,             "Client".email),
      "tgUserId"       = COALESCE(EXCLUDED."tgUserId",        "Client"."tgUserId"),
      "passportNumber" = COALESCE(EXCLUDED."passportNumber",  "Client"."passportNumber"),
      "passportId"     = COALESCE(EXCLUDED."passportId",      "Client"."passportId"),
      "consentAt"      = COALESCE(EXCLUDED."consentAt",       "Client"."consentAt"),
      "mediaConsentAt" = COALESCE(EXCLUDED."mediaConsentAt",  "Client"."mediaConsentAt"),
      "callTaskAt"     = COALESCE(EXCLUDED."callTaskAt",      "Client"."callTaskAt"),
      "franchiseeId"   = COALESCE(EXCLUDED."franchiseeId",    "Client"."franchiseeId"),
      "updatedAt"      = NOW()
    RETURNING id
  `

  const finalClientId = upserted.id as string

  // Attendance — ON CONFLICT (activationId) для дополнительной защиты
  // от гонки: между SELECT existingAttendance и INSERT кто-то мог успеть
  // вставить с тем же activationId.
  const attendanceId = crypto.randomUUID()
  let insertedAttendanceId: string
  try {
    const [inserted] = await sql`
      INSERT INTO "ClientAttendance" (
        id, "clientId", "gameLeadId", role, confirmed, "activationId", "createdAt"
      ) VALUES (
        ${attendanceId},
        ${finalClientId},
        ${body.gameLeadId},
        ${body.attendance.role ?? "GUEST"}::"AttendanceRole",
        ${body.attendance.confirmed ?? false},
        ${body.attendance.activationId},
        NOW()
      )
      ON CONFLICT ("activationId") DO UPDATE SET
        role      = EXCLUDED.role,
        confirmed = EXCLUDED.confirmed
      RETURNING id
    `
    insertedAttendanceId = inserted.id as string
  } catch (err: any) {
    // Ловим unique_violation на (clientId, gameLeadId) — это когда
    // тот же клиент уже отмечен на этой же игре с ДРУГИМ activationId.
    // Не 500 — это data-level конфликт, не ошибка сервера.
    if (err?.code === "23505") {
      await logApp({
        level: "warn",
        source: "webhook",
        message: "seeker/clients: клиент уже прикреплён к этой игре с другим activationId",
        metadata: {
          clientId: finalClientId,
          gameLeadId: body.gameLeadId,
          newActivationId: body.attendance.activationId,
        },
      })
      return NextResponse.json(
        { error: "Client already attends this game with a different activationId" },
        { status: 409 },
      )
    }
    throw err
  }

  return NextResponse.json({
    success: true,
    clientId: finalClientId,
    attendanceId: insertedAttendanceId,
  })
}
