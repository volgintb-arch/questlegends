import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Sipuni HTTP Events webhook — входящие/исходящие звонки
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let payload: any

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      payload = Object.fromEntries(formData.entries())
    } else {
      payload = await request.json()
    }

    console.log("[sipuni] Webhook received:", JSON.stringify(payload).slice(0, 500))

    // Sipuni отправляет разные типы событий:
    // call_start, call_answer, call_end, call_record и др.
    const eventType = payload.event || payload.type || payload.call_event || "unknown"
    const callId = payload.call_id || payload.callId || payload.id || null
    const direction = payload.direction === "in" || payload.type === "incoming" ? "inbound" : "outbound"
    const callerNumber = payload.src_number || payload.from_number || payload.caller || payload.src || ""
    const calledNumber = payload.dst_number || payload.to_number || payload.called || payload.dst || ""
    const sipNumber = payload.sip_number || payload.sipNumber || payload.pbx_number || ""
    const duration = parseInt(payload.duration || payload.call_duration || "0") || 0
    const status = payload.status || (duration > 0 ? "answered" : "missed")
    const recordUrl = payload.record_url || payload.recording_url || payload.record || null
    const answeredByName = payload.operator_name || payload.answered_by || null
    const timestamp = payload.timestamp || payload.call_time || null

    // Найти франчайзи по SIP-номеру
    let franchiseeId: string | null = null
    if (sipNumber) {
      const settings = await sql`
        SELECT "franchiseeId" FROM sipuni_settings
        WHERE ${sipNumber} = ANY("sipNumbers") AND "isActive" = true
        LIMIT 1
      `
      if (settings.length > 0) {
        franchiseeId = settings[0].franchiseeId
      }
    }

    // Записываем звонок в лог
    if (eventType === "call_end" || eventType === "hangup" || eventType === "completed" || eventType === "unknown") {
      const logId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO call_log (
          id, "franchiseeId", "callId", direction, "callerNumber", "calledNumber",
          "sipNumber", status, duration, "recordUrl", "answeredByName",
          "startedAt", "endedAt", "createdAt"
        ) VALUES (
          ${logId}, ${franchiseeId}, ${callId}, ${direction}, ${callerNumber}, ${calledNumber},
          ${sipNumber}, ${status}, ${duration}, ${recordUrl}, ${answeredByName},
          ${timestamp ? new Date(timestamp) : new Date()},
          ${duration > 0 ? new Date(Date.now()) : null},
          NOW()
        )
      `

      // Попробовать привязать к лиду по номеру телефона
      const cleanNumber = callerNumber.replace(/\D/g, "").slice(-10)
      if (cleanNumber.length >= 10) {
        // Ищем в B2C (GameLead)
        const gameLead = await sql`
          SELECT id FROM "GameLead"
          WHERE replace(replace("clientPhone", '+', ''), ' ', '') LIKE ${"%" + cleanNumber}
          ORDER BY "createdAt" DESC LIMIT 1
        `
        if (gameLead.length > 0) {
          await sql`
            UPDATE call_log SET "linkedLeadId" = ${gameLead[0].id}, "linkedLeadType" = 'b2c'
            WHERE id = ${logId}
          `
        } else {
          // Ищем в B2B (Deal)
          const deal = await sql`
            SELECT id FROM "Deal"
            WHERE replace(replace("clientPhone", '+', ''), ' ', '') LIKE ${"%" + cleanNumber}
            ORDER BY "createdAt" DESC LIMIT 1
          `
          if (deal.length > 0) {
            await sql`
              UPDATE call_log SET "linkedLeadId" = ${deal[0].id}, "linkedLeadType" = 'b2b'
              WHERE id = ${logId}
            `
          }
        }
      }

      console.log(`[sipuni] Call logged: ${direction} ${callerNumber} → ${calledNumber}, status=${status}, duration=${duration}s`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[sipuni] Webhook error:", error)
    return NextResponse.json({ ok: true }) // Always return 200 to prevent retries
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
