// Routing Engine - маршрутизация в B2B или B2C CRM
import { sql } from "@/lib/db"
import type { NormalizedMessage } from "./message-normalizer"

export interface RoutingDecision {
  shouldCreateLead: boolean
  leadType: "b2b" | "b2c"
  reason: string
  existingLeadId?: string
}

export class RoutingEngine {
  // Определить нужно ли создавать лид и какого типа
  static async determineRouting(message: NormalizedMessage, integrationId: string): Promise<RoutingDecision> {
    console.log("[v0] RoutingEngine: Determining routing", { integrationId, owner_type: message.owner_type })

    // 1. Проверка на дубли
    const existingLead = await this.checkDuplicate(message)
    if (existingLead) {
      return {
        shouldCreateLead: false,
        leadType: existingLead.lead_type,
        reason: "duplicate",
        existingLeadId: existingLead.lead_id,
      }
    }

    // 2. Получить правила триггеров
    const triggers = await this.getTriggerRules(integrationId)

    // 3. Проверить правила
    const shouldCreate = await this.evaluateTriggers(message, triggers)

    if (!shouldCreate) {
      return {
        shouldCreateLead: false,
        leadType: message.owner_type === "uk" ? "b2b" : "b2c",
        reason: "no_trigger_match",
      }
    }

    // 4. Определить тип лида по владельцу
    const leadType = message.owner_type === "uk" ? "b2b" : "b2c"

    return {
      shouldCreateLead: true,
      leadType,
      reason: "trigger_matched",
    }
  }

  // Проверка на дубли по external_user_id или телефону
  private static async checkDuplicate(message: NormalizedMessage) {
    // Проверка по external_user_id
    const byExternalId = await sql`
      SELECT lead_id, lead_type FROM LeadDeduplication
      WHERE channel = ${message.channel}
      AND external_user_id = ${message.external_user_id}
      LIMIT 1
    `

    if (byExternalId.length > 0) {
      return byExternalId[0]
    }

    // Проверка по телефону (если есть)
    if (message.phone) {
      const byPhone = await sql`
        SELECT lead_id, lead_type FROM LeadDeduplication
        WHERE phone = ${message.phone}
        LIMIT 1
      `

      if (byPhone.length > 0) {
        return byPhone[0]
      }
    }

    return null
  }

  // Получить правила триггеров для интеграции
  private static async getTriggerRules(integrationId: string) {
    return await sql`
      SELECT * FROM TriggerRule
      WHERE integration_id = ${integrationId}
      AND is_active = true
      ORDER BY priority DESC
    `
  }

  // Оценить правила триггеров
  private static async evaluateTriggers(message: NormalizedMessage, triggers: any[]): Promise<boolean> {
    if (triggers.length === 0) {
      // По умолчанию создаем лид при первом сообщении
      return await this.isFirstMessage(message)
    }

    for (const trigger of triggers) {
      if (trigger.trigger_type === "always") {
        return true
      }

      if (trigger.trigger_type === "first_message") {
        const isFirst = await this.isFirstMessage(message)
        if (isFirst) return true
      }

      if (trigger.trigger_type === "keywords" && trigger.keywords) {
        const hasKeyword = this.checkKeywords(message.message_text, trigger.keywords, trigger.keywords_match_type)
        if (hasKeyword) return true
      }
    }

    return false
  }

  // Проверка первое ли это сообщение от пользователя
  private static async isFirstMessage(message: NormalizedMessage): Promise<boolean> {
    const previous = await sql`
      SELECT id FROM InboundMessage
      WHERE channel = ${message.channel}
      AND external_user_id = ${message.external_user_id}
      AND received_at < ${message.received_at.toISOString()}
      LIMIT 1
    `

    return previous.length === 0
  }

  // Проверка ключевых слов в тексте сообщения
  private static checkKeywords(text: string, keywords: string[], matchType: string): boolean {
    const lowerText = text.toLowerCase()

    if (matchType === "all") {
      return keywords.every((keyword) => lowerText.includes(keyword.toLowerCase()))
    }

    // По умолчанию "any"
    return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()))
  }
}
