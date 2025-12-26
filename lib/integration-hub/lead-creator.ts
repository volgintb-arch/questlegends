// Lead Creator - автоматическое создание лидов в B2B или B2C CRM
import { sql } from "@/lib/db"
import type { NormalizedMessage } from "./message-normalizer"
import type { RoutingDecision } from "./routing-engine"
import { saveDeduplicationRecord } from "./deduplication-record-saver" // Import the saveDeduplicationRecord function

export class LeadCreator {
  // Создать лид в соответствующей CRM
  static async createLead(
    message: NormalizedMessage,
    routing: RoutingDecision,
    integrationId: string,
  ): Promise<{ success: boolean; leadId?: string; error?: string }> {
    try {
      console.log("[v0] LeadCreator: Creating lead", { leadType: routing.leadType, integrationId })

      let leadId: string

      if (routing.leadType === "b2b") {
        leadId = await this.createB2BDeal(message, integrationId)
      } else {
        leadId = await this.createB2CLead(message, integrationId)
      }

      // Сохранить запись дедупликации
      await saveDeduplicationRecord(message, leadId, routing.leadType, integrationId)

      // Обновить статистику
      await this.updateStats(integrationId, "leads_created")

      // Связать сообщение с лидом
      await this.linkMessageToLead(message, leadId, routing.leadType)

      console.log("[v0] LeadCreator: Lead created successfully", { leadId, leadType: routing.leadType })

      return { success: true, leadId }
    } catch (error) {
      console.error("[v0] LeadCreator: Error creating lead", error)
      return { success: false, error: String(error) }
    }
  }

  // Создать B2B Deal (для УК - продажа франшиз)
  private static async createB2BDeal(message: NormalizedMessage, integrationId: string): Promise<string> {
    // Получить ответственного
    const assignee = await this.getAssignee(integrationId, "uk")

    const result = await sql`
      INSERT INTO B2BDeal (
        name,
        phone,
        source,
        status,
        stage,
        responsible_id,
        comment,
        created_at
      ) VALUES (
        ${message.username || message.external_user_id},
        ${message.phone || null},
        ${`${message.channel}_integration`},
        'new',
        'new_lead',
        ${assignee?.id || null},
        ${`Автосоздано из ${message.channel}: ${message.message_text}`},
        NOW()
      )
      RETURNING id
    `

    return result[0].id
  }

  // Создать B2C Lead (для франчайзи - продажа игр)
  private static async createB2CLead(message: NormalizedMessage, integrationId: string): Promise<string> {
    // Получить ответственного и франчайзи
    const assignee = await this.getAssignee(integrationId, "franchisee")

    const result = await sql`
      INSERT INTO GameLead (
        name,
        phone,
        source,
        status,
        stage,
        responsible_id,
        franchisee_id,
        comment,
        telegram_id,
        instagram_username,
        vk_id,
        created_at
      ) VALUES (
        ${message.username || message.external_user_id},
        ${message.phone || null},
        ${`${message.channel}_integration`},
        'new',
        'new_lead',
        ${assignee?.id || null},
        ${message.owner_id || null},
        ${`Автосоздано из ${message.channel}: ${message.message_text}`},
        ${message.channel === "telegram" ? message.external_user_id : null},
        ${message.channel === "instagram" ? message.external_user_id : null},
        ${message.channel === "vk" ? message.external_user_id : null},
        NOW()
      )
      RETURNING id
    `

    return result[0].id
  }

  // Получить ответственного по стратегии автоназначения
  private static async getAssignee(integrationId: string, ownerType: string) {
    // Получить настройки интеграции
    const integration = await sql`
      SELECT assignment_strategy, default_assignee_id, owner_id
      FROM Integration
      WHERE id = ${integrationId}
      LIMIT 1
    `

    if (integration.length === 0) return null

    const config = integration[0]

    if (config.assignment_strategy === "default_user" && config.default_assignee_id) {
      return { id: config.default_assignee_id }
    }

    if (config.assignment_strategy === "first_admin") {
      const admin = await sql`
        SELECT id FROM "User"
        WHERE role IN ('super_admin', 'uk', 'uk_employee')
        ${ownerType === "franchisee" && config.owner_id ? sql`AND franchisee_id = ${config.owner_id}` : sql``}
        ORDER BY created_at ASC
        LIMIT 1
      `

      return admin.length > 0 ? admin[0] : null
    }

    if (config.assignment_strategy === "round_robin") {
      // Получить последнего назначенного и взять следующего
      const users = await sql`
        SELECT id FROM "User"
        WHERE role IN ('super_admin', 'uk', 'uk_employee', 'franchisee')
        ${ownerType === "franchisee" && config.owner_id ? sql`AND franchisee_id = ${config.owner_id}` : sql``}
        ORDER BY id
      `

      if (users.length === 0) return null

      // Простая round-robin логика
      const randomIndex = Math.floor(Math.random() * users.length)
      return users[randomIndex]
    }

    return null
  }

  // Обновить статистику
  private static async updateStats(integrationId: string, metric: string) {
    await sql`
      INSERT INTO IntegrationStats (integration_id, date, ${sql(metric)})
      VALUES (${integrationId}, CURRENT_DATE, 1)
      ON CONFLICT (integration_id, date)
      DO UPDATE SET
        ${sql(metric)} = IntegrationStats.${sql(metric)} + 1,
        updated_at = NOW()
    `
  }

  // Связать сообщение с созданным лидом
  private static async linkMessageToLead(message: NormalizedMessage, leadId: string, leadType: string) {
    await sql`
      UPDATE InboundMessage
      SET lead_id = ${leadId},
          lead_type = ${leadType},
          status = 'processed',
          processed_at = NOW()
      WHERE channel = ${message.channel}
      AND external_user_id = ${message.external_user_id}
      AND received_at = ${message.received_at.toISOString()}
    `
  }

  // Обновить статистику дублей
  static async updateDuplicateStats(integrationId: string) {
    await this.updateStats(integrationId, "duplicates_prevented")
  }
}
