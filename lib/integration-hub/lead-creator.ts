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
    const assignee = await this.getAssignee(integrationId, "uk")
    const dealId = globalThis.crypto.randomUUID()
    const clientName = message.username || message.external_user_id
    const comment = `Автосоздано из ${message.channel}: ${message.message_text}`

    await sql`
      INSERT INTO "Deal" (
        id, "clientName", "clientPhone", source, stage,
        "additionalComment", "responsibleId",
        "createdAt", "updatedAt"
      ) VALUES (
        ${dealId},
        ${clientName},
        ${message.phone || null},
        ${`${message.channel}_bot`},
        'NEW',
        ${comment},
        ${assignee?.id || null},
        NOW(), NOW()
      )
    `

    return dealId
  }

  // Создать B2C Lead (для франчайзи - продажа игр)
  private static async createB2CLead(message: NormalizedMessage, integrationId: string): Promise<string> {
    // Получить ответственного и франчайзи
    const assignee = await this.getAssignee(integrationId, "franchisee")
    const franchiseeId = message.owner_id

    if (!franchiseeId) {
      throw new Error("Franchisee ID is required for B2C lead")
    }

    // Получить первую воронку и стадию для этого франчайзи
    const pipeline = await sql`
      SELECT gp.id as pipeline_id, gps.id as stage_id
      FROM "GamePipeline" gp
      JOIN "GamePipelineStage" gps ON gps."pipelineId" = gp.id
      WHERE gp."franchiseeId" = ${franchiseeId}
      ORDER BY gp."createdAt" ASC, gps."order" ASC
      LIMIT 1
    `

    if (pipeline.length === 0) {
      throw new Error("No pipeline found for franchisee")
    }

    const leadId = globalThis.crypto.randomUUID()
    const clientName = message.username || message.external_user_id
    const notes = `Автосоздано из ${message.channel}: ${message.message_text}`

    await sql`
      INSERT INTO "GameLead" (
        id, "clientName", "clientPhone", source, notes,
        "responsibleId", "pipelineId", "stageId", "franchiseeId",
        "createdAt", "updatedAt"
      ) VALUES (
        ${leadId},
        ${clientName},
        ${message.phone || null},
        ${`${message.channel}_bot`},
        ${notes},
        ${assignee?.id || null},
        ${pipeline[0].pipeline_id},
        ${pipeline[0].stage_id},
        ${franchiseeId},
        NOW(), NOW()
      )
    `

    return leadId
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
        WHERE role IN ('uk', 'uk_employee')
        ${ownerType === "franchisee" && config.owner_id ? sql`AND "franchiseeId" = ${config.owner_id}` : sql``}
        ORDER BY "createdAt" ASC
        LIMIT 1
      `

      return admin.length > 0 ? admin[0] : null
    }

    if (config.assignment_strategy === "round_robin") {
      // Получить последнего назначенного и взять следующего
      const users = await sql`
        SELECT id FROM "User"
        WHERE role IN ('uk', 'uk_employee', 'franchisee')
        ${ownerType === "franchisee" && config.owner_id ? sql`AND "franchiseeId" = ${config.owner_id}` : sql``}
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
    try {
      if (metric === "leads_created") {
        await sql`
          INSERT INTO integrationstats (integration_id, date, leads_created)
          VALUES (${integrationId}, CURRENT_DATE, 1)
          ON CONFLICT (integration_id, date)
          DO UPDATE SET leads_created = integrationstats.leads_created + 1, updated_at = NOW()
        `
      } else if (metric === "duplicates_prevented") {
        await sql`
          INSERT INTO integrationstats (integration_id, date, duplicates_prevented)
          VALUES (${integrationId}, CURRENT_DATE, 1)
          ON CONFLICT (integration_id, date)
          DO UPDATE SET duplicates_prevented = integrationstats.duplicates_prevented + 1, updated_at = NOW()
        `
      }
    } catch (error) {
      console.error("[v0] LeadCreator: Stats update failed", error)
    }
  }

  // Связать сообщение с созданным лидом
  private static async linkMessageToLead(message: NormalizedMessage, leadId: string, leadType: string) {
    await sql`
      UPDATE inboundmessage
      SET lead_id = ${leadId},
          lead_type = ${leadType},
          status = 'processed',
          processed_at = NOW()
      WHERE id = (
        SELECT id FROM inboundmessage
        WHERE channel = ${message.channel}
        AND external_user_id = ${message.external_user_id}
        AND lead_id IS NULL
        ORDER BY received_at DESC
        LIMIT 1
      )
    `
  }

  // Обновить статистику дублей
  static async updateDuplicateStats(integrationId: string) {
    await this.updateStats(integrationId, "duplicates_prevented")
  }
}
