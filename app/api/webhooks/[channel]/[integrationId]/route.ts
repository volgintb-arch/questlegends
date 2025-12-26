// Unified webhook endpoint для всех каналов
import { type NextRequest, NextResponse } from "next/server"
import { IntegrationHub } from "@/lib/integration-hub/integration-hub"
import { RoutingEngine } from "@/lib/integration-hub/routing-engine"
import { LeadCreator } from "@/lib/integration-hub/lead-creator"

export async function POST(request: NextRequest, { params }: { params: { channel: string; integrationId: string } }) {
  try {
    const { channel, integrationId } = params
    console.log("[v0] Webhook received", { channel, integrationId })

    // Получить payload
    const payload = await request.json()

    // Валидация канала
    const supportedChannels = ["telegram", "instagram", "vk", "whatsapp", "avito", "max"]
    if (!supportedChannels.includes(channel)) {
      return NextResponse.json({ error: "Unsupported channel" }, { status: 400 })
    }

    // 1. Process incoming message через Integration Hub
    const messageResult = await IntegrationHub.processIncomingMessage(channel, payload, integrationId)

    if (!messageResult.success) {
      return NextResponse.json({ error: messageResult.error }, { status: 500 })
    }

    // 2. Получить нормализованное сообщение из БД
    const message = await getMessageById(messageResult.messageId!)

    // 3. Routing decision
    const routing = await RoutingEngine.determineRouting(message, integrationId)

    // 4. Создать лид если нужно
    if (routing.shouldCreateLead) {
      await LeadCreator.createLead(message, routing, integrationId)
    } else if (routing.existingLeadId) {
      // Обновить статистику дублей
      await LeadCreator.updateDuplicateStats(integrationId)
    }

    return NextResponse.json({ success: true, routing })
  } catch (error) {
    console.error("[v0] Webhook error", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET для верификации webhook (для некоторых платформ)
export async function GET(request: NextRequest, { params }: { params: { channel: string; integrationId: string } }) {
  const { channel } = params
  const searchParams = request.nextUrl.searchParams

  // Telegram webhook verification
  if (channel === "telegram") {
    return NextResponse.json({ ok: true })
  }

  // Instagram/Facebook webhook verification
  if (channel === "instagram" || channel === "whatsapp") {
    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")

    if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 })
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 403 })
  }

  // VK Callback API confirmation
  if (channel === "vk") {
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}

// Вспомогательная функция для получения сообщения
async function getMessageById(messageId: string) {
  const { sql } = await import("@/lib/db")
  const result = await sql`
    SELECT * FROM InboundMessage
    WHERE id = ${messageId}
    LIMIT 1
  `

  if (result.length === 0) {
    throw new Error("Message not found")
  }

  const msg = result[0]

  return {
    channel: msg.channel,
    external_user_id: msg.external_user_id,
    username: msg.username,
    phone: msg.phone,
    message_text: msg.message_text,
    attachments: msg.attachments,
    owner_type: msg.owner_type,
    owner_id: msg.owner_id,
    received_at: new Date(msg.received_at),
    raw_payload: msg.raw_payload,
  }
}
