// Unified webhook endpoint для всех каналов
import { type NextRequest, NextResponse } from "next/server"
import { IntegrationHub } from "@/lib/integration-hub/integration-hub"
import { RoutingEngine } from "@/lib/integration-hub/routing-engine"
import { LeadCreator } from "@/lib/integration-hub/lead-creator"

export async function POST(request: NextRequest, { params }: { params: Promise<{ channel: string; integrationId: string }> }) {
  const { channel, integrationId } = await params
  try {

    // Валидация канала
    const supportedChannels = ["telegram", "instagram", "vk", "whatsapp", "avito", "tilda"]
    if (!supportedChannels.includes(channel)) {
      return NextResponse.json({ error: "Unsupported channel" }, { status: 400 })
    }

    // Получить payload — Tilda может отправлять form-urlencoded, multipart или JSON
    let payload: any
    const contentType = request.headers.get("content-type") || ""
    console.log(`[v0] Webhook ${channel}: content-type=${contentType}`)
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      payload = Object.fromEntries(formData.entries())
    } else if (contentType.includes("text/plain")) {
      // Некоторые сервисы шлют plain text
      const text = await request.text()
      try { payload = JSON.parse(text) } catch { payload = { text } }
    } else {
      payload = await request.json()
    }
    console.log(`[v0] Webhook ${channel}: payload keys=${Object.keys(payload).join(",")}`, channel === "tilda" ? payload : "")

    // Tilda отправляет тестовый запрос с полем test=test — отвечаем 200
    if (channel === "tilda" && payload.test === "test") {
      return NextResponse.json({ ok: true })
    }

    // VK Callback API: confirmation — вернуть строку подтверждения
    if (channel === "vk" && payload.type === "confirmation") {
      const { sql } = await import("@/lib/db")
      const integration = await sql`
        SELECT credentials FROM integration WHERE id = ${integrationId} LIMIT 1
      `
      if (integration.length > 0) {
        const creds = typeof integration[0].credentials === "string"
          ? JSON.parse(integration[0].credentials)
          : integration[0].credentials
        return new NextResponse(creds.confirmation_code || "ok", { status: 200 })
      }
      return new NextResponse("ok", { status: 200 })
    }

    // VK: для всех остальных событий отвечаем "ok" (VK требует), обрабатываем только message_new
    if (channel === "vk" && payload.type !== "message_new") {
      return new NextResponse("ok", { status: 200 })
    }

    // Instagram/WhatsApp: пропустить если нет сообщений (status updates, etc.)
    if (channel === "instagram") {
      const messaging = payload?.entry?.[0]?.messaging?.[0]
      if (!messaging?.message) {
        return NextResponse.json({ ok: true })
      }
    }
    if (channel === "whatsapp") {
      const messages = payload?.entry?.[0]?.changes?.[0]?.value?.messages
      if (!messages || messages.length === 0) {
        return NextResponse.json({ ok: true })
      }
    }

    // 1. Process incoming message через Integration Hub
    console.log(`[v0] Webhook ${channel}: Step 1 — processIncomingMessage`)
    const messageResult = await IntegrationHub.processIncomingMessage(channel, payload, integrationId)

    if (!messageResult.success) {
      console.error(`[v0] Webhook ${channel}: processIncomingMessage FAILED:`, messageResult.error)
      return NextResponse.json({ error: messageResult.error }, { status: 500 })
    }
    console.log(`[v0] Webhook ${channel}: Step 1 OK, messageId=${messageResult.messageId}`)

    // 2. Получить нормализованное сообщение из БД
    const message = await getMessageById(messageResult.messageId!)
    console.log(`[v0] Webhook ${channel}: Step 2 OK, message fetched`)

    // 3. Routing decision
    const routing = await RoutingEngine.determineRouting(message, integrationId)
    console.log(`[v0] Webhook ${channel}: Step 3 routing:`, JSON.stringify(routing))

    // 4. Создать лид если нужно
    if (routing.shouldCreateLead) {
      console.log(`[v0] Webhook ${channel}: Step 4 — creating lead, type=${routing.leadType}`)
      await LeadCreator.createLead(message, routing, integrationId)
      console.log(`[v0] Webhook ${channel}: Step 4 OK — lead created`)
    } else if (routing.existingLeadId) {
      console.log(`[v0] Webhook ${channel}: Step 4 — duplicate, existingLeadId=${routing.existingLeadId}`)
      await LeadCreator.updateDuplicateStats(integrationId)
    }

    // VK требует plain text "ok" в ответ на все callback-события
    if (channel === "vk") {
      return new NextResponse("ok", { status: 200 })
    }

    return NextResponse.json({ success: true, routing })
  } catch (error) {
    console.error("[v0] Webhook error", error)
    // VK требует "ok" даже при ошибках, иначе будет ретрай
    if (channel === "vk") {
      return new NextResponse("ok", { status: 200 })
    }
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET для верификации webhook (для некоторых платформ)
export async function GET(request: NextRequest, { params }: { params: Promise<{ channel: string; integrationId: string }> }) {
  const { channel } = await params
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
