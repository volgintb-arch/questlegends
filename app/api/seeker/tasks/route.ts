import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyWebhook, WEBHOOK_SIGNATURE_HEADER } from "@/lib/webhook-signing"
import { logApp } from "@/lib/app-logger"

// POST /api/seeker/tasks
// Приёмник от seeker-passport — просит создать менеджерскую задачу
// (обычно «позвонить за 45 дней до ДР ребёнка»).
// См. docs/CRM.md в проекте seeker-passport для полного контракта.

type IncomingBody = {
  leadId: string
  title: string
  description?: string | null
  deadline?: string | null // ISO datetime
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
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

  const rawBody = await req.text()
  const signature = req.headers.get(WEBHOOK_SIGNATURE_HEADER)

  if (!verifyWebhook(signature, rawBody, secret)) {
    await logApp({
      level: "warn",
      source: "webhook",
      message: "seeker/tasks: invalid HMAC signature",
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

  if (!isNonEmptyString(body?.leadId) || !isNonEmptyString(body?.title)) {
    return NextResponse.json(
      { error: "Missing required fields: leadId, title" },
      { status: 400 },
    )
  }

  const [gameLead] = await sql`SELECT id FROM "GameLead" WHERE id = ${body.leadId}`
  if (!gameLead) {
    return NextResponse.json({ error: `GameLead not found: ${body.leadId}` }, { status: 409 })
  }

  // Мягкая идемпотентность: если у этого лида уже есть pending-задача с
  // ровно таким же title и deadline — не дублируем. Seeker может ретраить
  // при таймаутах, не хочется 5 одинаковых задач в CRM.
  const deadlineOrNull = body.deadline ?? null
  const [existing] = await sql`
    SELECT id FROM "GameLeadTask"
    WHERE "leadId" = ${body.leadId}
      AND title = ${body.title}
      AND (
        (${deadlineOrNull}::timestamp IS NULL AND deadline IS NULL) OR
        deadline = ${deadlineOrNull}::timestamp
      )
      AND status = 'pending'
    LIMIT 1
  `
  if (existing) {
    return NextResponse.json({ success: true, idempotent: true, taskId: existing.id })
  }

  const taskId = crypto.randomUUID()
  await sql`
    INSERT INTO "GameLeadTask" (id, "leadId", title, description, deadline, status, "isCompleted", "createdAt")
    VALUES (
      ${taskId},
      ${body.leadId},
      ${body.title.trim()},
      ${body.description ?? null},
      ${deadlineOrNull},
      'pending',
      false,
      NOW()
    )
  `

  return NextResponse.json({ success: true, taskId })
}
