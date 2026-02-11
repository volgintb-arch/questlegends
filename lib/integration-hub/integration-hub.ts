// Integration Hub - единая точка входа для всех каналов
import { MessageNormalizer, type NormalizedMessage } from "./message-normalizer"
import { sql } from "@/lib/db"

export class IntegrationHub {
  // Обработка входящего сообщения из любого канала
  static async processIncomingMessage(
    channel: string,
    payload: any,
    integrationId: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log("[v0] IntegrationHub: Processing incoming message", { channel, integrationId })

      // 1. Получить конфигурацию интеграции
      const integration = await this.getIntegration(integrationId)
      if (!integration || !integration.is_active) {
        return { success: false, error: "Integration not found or inactive" }
      }

      // 2. Нормализовать сообщение
      const normalizedMessage = await this.normalizeMessage(channel, payload, integration)

      // 3. Сохранить в БД
      const messageId = await this.saveInboundMessage(normalizedMessage, integrationId)

      // 4. Обновить статистику
      await this.updateStats(integrationId, "messages_received")

      console.log("[v0] IntegrationHub: Message processed successfully", { messageId })

      return { success: true, messageId }
    } catch (error) {
      console.error("[v0] IntegrationHub: Error processing message", error)
      return { success: false, error: String(error) }
    }
  }

  // Нормализация сообщения по каналу
  private static async normalizeMessage(channel: string, payload: any, integration: any): Promise<NormalizedMessage> {
    switch (channel) {
      case "telegram":
        return MessageNormalizer.normalizeTelegram(payload, integration)
      case "instagram":
        return MessageNormalizer.normalizeInstagram(payload, integration)
      case "vk":
        return MessageNormalizer.normalizeVK(payload, integration)
      case "whatsapp":
        return MessageNormalizer.normalizeWhatsApp(payload, integration)
      case "avito":
        return MessageNormalizer.normalizeAvito(payload, integration)
      default:
        throw new Error(`Unsupported channel: ${channel}`)
    }
  }

  // Получить интеграцию из БД
  private static async getIntegration(integrationId: string) {
    const result = await sql`
      SELECT * FROM Integration
      WHERE id = ${integrationId}
      LIMIT 1
    `
    return result[0]
  }

  // Сохранить нормализованное сообщение
  private static async saveInboundMessage(message: NormalizedMessage, integrationId: string): Promise<string> {
    const result = await sql`
      INSERT INTO InboundMessage (
        integration_id,
        channel,
        external_user_id,
        username,
        phone,
        message_text,
        attachments,
        owner_type,
        owner_id,
        received_at,
        raw_payload,
        status
      ) VALUES (
        ${integrationId},
        ${message.channel},
        ${message.external_user_id},
        ${message.username || null},
        ${message.phone || null},
        ${message.message_text},
        ${JSON.stringify(message.attachments || null)},
        ${message.owner_type},
        ${message.owner_id || null},
        ${message.received_at.toISOString()},
        ${JSON.stringify(message.raw_payload)},
        'pending'
      )
      RETURNING id
    `

    return result[0].id
  }

  // Обновить статистику интеграции
  private static async updateStats(integrationId: string, metric: string) {
    try {
      await sql`
        INSERT INTO IntegrationStats (integration_id, date, ${metric})
        VALUES (${integrationId}, CURRENT_DATE, 1)
        ON CONFLICT (integration_id, date)
        DO UPDATE SET
          ${metric} = IntegrationStats.${metric} + 1,
          updated_at = NOW()
      `
    } catch (error) {
      // Статистика не критична - не ломаем основной поток
      console.error("[v0] IntegrationHub: Failed to update stats", error)
    }
  }

  // Генерация уникального webhook URL
  static generateWebhookUrl(integrationId: string, channel: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://questlegends-os-dashboard.vercel.app"
    const secret = this.generateWebhookSecret()
    return `${baseUrl}/api/webhooks/${channel}/${integrationId}?secret=${secret}`
  }

  // Генерация секрета webhook
  private static generateWebhookSecret(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let secret = ""
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return secret
  }
}
