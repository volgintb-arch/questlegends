// Lead Creator - автоматическое создание лидов в B2B или B2C CRM
import { sql } from "@/lib/db"
import { sendPushToUsers } from "@/lib/push"
import type { NormalizedMessage } from "./message-normalizer"
import type { RoutingDecision } from "./routing-engine"
import { saveDeduplicationRecord } from "./deduplication-record-saver" // Import the saveDeduplicationRecord function
import { extractTracking } from "./extract-tracking"

export class LeadCreator {
  // Создать лид в соответствующей CRM
  static async createLead(
    message: NormalizedMessage,
    routing: RoutingDecision,
    integrationId: string,
    opts?: { payloadLogId?: string | null },
  ): Promise<{ success: boolean; leadId?: string; error?: string }> {
    try {
      console.log("[v0] LeadCreator: Creating lead", { leadType: routing.leadType, integrationId })

      let leadId: string

      if (routing.leadType === "b2b") {
        leadId = await this.createB2BDeal(message, integrationId, opts?.payloadLogId || null)
      } else {
        leadId = await this.createB2CLead(message, integrationId, opts?.payloadLogId || null)
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

  // Извлечь данные из текста сообщения и профиля
  private static extractMessageData(message: NormalizedMessage) {
    const text = message.message_text
    const raw = typeof message.raw_payload === "string" ? JSON.parse(message.raw_payload) : message.raw_payload

    // Полное имя из профиля мессенджера
    let fullName: string | null = null
    if (message.channel === "telegram") {
      const from = raw?.message?.from
      const parts = [from?.first_name, from?.last_name].filter(Boolean)
      if (parts.length > 0) fullName = parts.join(" ")
    } else if (message.channel === "instagram") {
      fullName = raw?.full_name || raw?.name || null
    } else if (message.channel === "vk") {
      const parts = [raw?.first_name, raw?.last_name].filter(Boolean)
      if (parts.length > 0) fullName = parts.join(" ")
    } else if (message.channel === "tilda") {
      fullName = raw?.Name || raw?.name || null
    } else if (message.channel === "marquiz") {
      // Marquiz: contacts может быть объектом или массивом
      if (raw?.contacts) {
        if (Array.isArray(raw.contacts)) {
          const nameC = raw.contacts.find((c: any) => c.type === "name" || c.key === "name")
          if (nameC) fullName = nameC.value || null
        } else if (typeof raw.contacts === "object") {
          fullName = raw.contacts.name || null
        }
      }
      if (!fullName) fullName = raw?.name || raw?.contactName || null
    } else if (message.channel === "avito") {
      fullName = raw?.user_name || null
    }

    // Ссылка на аккаунт
    let messengerLink: string | null = null
    if (message.channel === "telegram") {
      const username = raw?.message?.from?.username
      if (username) messengerLink = `https://t.me/${username}`
    } else if (message.channel === "instagram") {
      if (message.username) messengerLink = `https://instagram.com/${message.username}`
    } else if (message.channel === "vk") {
      messengerLink = `https://vk.com/id${message.external_user_id}`
    } else if (message.channel === "tilda") {
      messengerLink = raw?.pageurl || null
    }

    // Telegram username
    let clientTelegram: string | null = null
    if (message.channel === "telegram") {
      const from = raw?.message?.from
      clientTelegram = from?.username ? `@${from.username}` : null
    }

    // Извлечь дату из текста
    let gameDate: string | null = null
    const months: Record<string, string> = {
      января: "01", февраля: "02", марта: "03", апреля: "04",
      мая: "05", июня: "06", июля: "07", августа: "08",
      сентября: "09", октября: "10", ноября: "11", декабря: "12",
    }
    const dateMatch = text.match(/(\d{1,2})\s*-?\s*(?:е|го)?\s*(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/i)
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, "0")
      const month = months[dateMatch[2].toLowerCase()]
      const year = new Date().getFullYear()
      gameDate = `${year}-${month}-${day}T00:00:00.000Z`
    } else {
      const numDateMatch = text.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/)
      if (numDateMatch) {
        const day = numDateMatch[1].padStart(2, "0")
        const month = numDateMatch[2].padStart(2, "0")
        const year = numDateMatch[3] ? (numDateMatch[3].length === 2 ? `20${numDateMatch[3]}` : numDateMatch[3]) : String(new Date().getFullYear())
        gameDate = `${year}-${month}-${day}T00:00:00.000Z`
      }
    }

    // Извлечь город
    let city: string | null = null
    const cityPatterns = [
      /(?:город|г\.)\s+([А-ЯЁа-яё-]+)/i,
      /(?:из|в|во)\s+(Москв[еау]?|Петербург[еа]?|Санкт-Петербург[еа]?|Новосибирск[еа]?|Екатеринбург[еа]?|Казан[иь]|Нижн(?:ий|ем)\s+Новгород[еа]?|Челябинск[еа]?|Омск[еа]?|Самар[еау]?|Ростов[еа]?|Уф[еау]?|Красноярск[еа]?|Перми?ь?|Воронеж[еа]?|Волгоград[еа]?|Тюмен[иь]?|Краснодар[еа]?|Сочи|Тольятти|Ижевск[еа]?|Барнаул[еа]?|Ульяновск[еа]?|Хабаровск[еа]?|Владивосток[еа]?|Ярославл[ья]?|Махачкал[еау]?|Томск[еа]?|Оренбург[еа]?|Кемерово?|Рязан[иь]?|Астрахан[иь]?|Пенз[еау]?|Липецк[еа]?|Тул[еау]?|Курск[еа]?|Ставрополь|Сургут[еа]?|Тверь|Твери|Иркутск[еа]?|Брянск[еа]?)/i,
    ]
    for (const pattern of cityPatterns) {
      const match = text.match(pattern)
      if (match) {
        // Нормализация падежных окончаний
        city = match[1].trim()
          .replace(/[еу]$/, "")        // Омске→Омск, Самару→Самар
          .replace(/и$/, "ь")          // Перми→Пермь, Твери→Тверь, Казани→Казань
          .replace(/ой$/, "ая")        // Москвой→Москвая — не нужно
          .replace(/(Москв).*/, "Москва")
          .replace(/(Самар).*/, "Самара")
          .replace(/(Махачкал).*/, "Махачкала")
          .replace(/(Уф).*/, "Уфа")
          .replace(/(Тул).*/, "Тула")
          .replace(/(Пенз).*/, "Пенза")
          .replace(/(Рязан).*/, "Рязань")
          .replace(/(Астрахан).*/, "Астрахань")
        break
      }
    }

    // Email (из Tilda/Marquiz формы или из текста)
    let clientEmail: string | null = null
    if (message.channel === "tilda" || message.channel === "marquiz") {
      clientEmail = raw?.Email || raw?.email || raw?.contactEmail || null
    }
    if (!clientEmail) {
      const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)
      if (emailMatch) clientEmail = emailMatch[0]
    }

    // Извлечь количество участников из текста
    let playersCount: number | null = null
    // Поиск по ключевым словам: "участников", "человек", "гостей", "детей", "количество"
    const playersPatterns = [
      /(?:участник|человек|гост|дет|ребён|игрок)[а-яё]*[:\s]*(\d+)\s*[-–]\s*(\d+)/i,
      /(\d+)\s*[-–]\s*(\d+)\s*(?:участник|человек|гост|дет|ребён|игрок)/i,
      /(?:количеств|сколько)[а-яё]*[^:]*?[:\s]*(\d+)\s*[-–]\s*(\d+)/i,
      /(?:участник|человек|гост|дет|ребён|игрок)[а-яё]*[:\s]*(\d+)/i,
      /(\d+)\s*(?:участник|человек|гост|дет|ребён|игрок)/i,
    ]
    for (const pattern of playersPatterns) {
      const match = text.match(pattern)
      if (match) {
        if (match[2]) {
          // Диапазон: берём нижнюю границу
          playersCount = parseInt(match[1])
        } else {
          playersCount = parseInt(match[1])
        }
        break
      }
    }
    // Fallback: ищем в ответах Marquiz конкретно
    if (!playersCount && message.channel === "marquiz") {
      const answers = raw?.answers || []
      if (Array.isArray(answers)) {
        for (const ans of answers) {
          const q = (ans.question || ans.q || ans.title || "").toLowerCase()
          const a = ans.answer || ans.a || ans.value || ""
          if (q.includes("количеств") || q.includes("участник") || q.includes("сколько")) {
            const numMatch = String(a).match(/(\d+)/)
            if (numMatch) {
              playersCount = parseInt(numMatch[1])
              break
            }
          }
        }
      }
    }

    // Marquiz: извлечь дату из ответов на вопросы (более точно чем из всего текста)
    if (!gameDate && message.channel === "marquiz") {
      const answers = raw?.answers || []
      if (Array.isArray(answers)) {
        for (const ans of answers) {
          const q = (ans.question || ans.q || ans.title || "").toLowerCase()
          const a = ans.answer || ans.a || ans.value || ""
          if (q.includes("дат") || q.includes("когда") || q.includes("число")) {
            const dMatch = String(a).match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/)
            if (dMatch) {
              const day = dMatch[1].padStart(2, "0")
              const month = dMatch[2].padStart(2, "0")
              const year = dMatch[3].length === 2 ? `20${dMatch[3]}` : dMatch[3]
              gameDate = `${year}-${month}-${day}T00:00:00.000Z`
              break
            }
          }
        }
      }
    }

    // Marquiz: извлечь телефон из contacts если не в message.phone
    let clientPhone: string | null = message.phone || null
    if (!clientPhone && message.channel === "marquiz" && raw?.contacts) {
      if (Array.isArray(raw.contacts)) {
        const phoneC = raw.contacts.find((c: any) => c.type === "phone" || c.key === "phone")
        if (phoneC) clientPhone = phoneC.value || null
      } else if (typeof raw.contacts === "object") {
        clientPhone = raw.contacts.phone || null
      }
    }

    // Конвертировать gameDate строку в Date объект для postgres
    let gameDateObj: Date | null = null
    if (gameDate) {
      const d = new Date(gameDate)
      if (!isNaN(d.getTime())) gameDateObj = d
    }

    return { fullName, messengerLink, clientTelegram, gameDate: gameDateObj, city, clientEmail, playersCount, clientPhone }
  }

  // Отправить уведомление о новом лиде
  private static async sendNotification(recipientId: string, dealId: string, clientName: string, channel: string, leadType: string) {
    try {
      const notifId = globalThis.crypto.randomUUID()
      const now = new Date().toISOString()
      const channelName = { telegram: "Telegram", instagram: "Instagram", vk: "VK", whatsapp: "WhatsApp", avito: "Авито", tilda: "Tilda (сайт)", marquiz: "Marquiz", max: "MAX" }[channel] || channel
      const title = "Новый лид из " + channelName
      const msg = `Новая заявка от ${clientName} через ${channelName}`

      await sql`
        INSERT INTO "Notification" (
          id, type, title, message, "recipientId", "relatedDealId",
          "isRead", "isArchived", "createdAt", "updatedAt"
        ) VALUES (
          ${notifId}, 'deal', ${title}, ${msg}, ${recipientId}, ${dealId},
          false, false, ${now}, ${now}
        )
      `

      // Push-уведомление (non-blocking)
      sendPushToUsers([recipientId], {
        title,
        body: msg,
        url: `/crm?dealId=${dealId}`,
      }).catch(() => {})
    } catch (error) {
      console.error("[v0] LeadCreator: Notification failed", error)
    }
  }

  // Найти или создать фиксированную воронку "Интеграции" для B2B
  private static async getOrCreateB2BIntegrationPipeline(): Promise<{ pipeline_id: string; stage_id: string } | null> {
    // Ищем существующую воронку "Интеграции"
    const existing = await sql`
      SELECT p.id as pipeline_id, ps.id as stage_id
      FROM "Pipeline" p
      JOIN "PipelineStage" ps ON ps."pipelineId" = p.id
      WHERE p.name = 'Интеграции'
      ORDER BY ps."order" ASC
      LIMIT 1
    `
    if (existing.length > 0) return existing[0]

    // Создать воронку "Интеграции" с базовыми стадиями
    const pipelineId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "Pipeline" (id, name, description, color, "isDefault", "createdAt")
      VALUES (${pipelineId}, 'Интеграции', 'Лиды из интеграций (Telegram, VK, Tilda и др.)', '#8B5CF6', false, NOW())
    `

    const stages = [
      { name: "Новый", color: "#3B82F6", order: 0, stageType: "new" },
      { name: "В работе", color: "#F59E0B", order: 1, stageType: "in_progress" },
      { name: "Успешно", color: "#10B981", order: 2, stageType: "won" },
      { name: "Отказ", color: "#EF4444", order: 3, stageType: "lost" },
    ]

    let firstStageId = ""
    for (const stage of stages) {
      const stageId = globalThis.crypto.randomUUID()
      if (stage.order === 0) firstStageId = stageId
      await sql`
        INSERT INTO "PipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType", "createdAt")
        VALUES (${stageId}, ${pipelineId}, ${stage.name}, ${stage.color}, ${stage.order}, true, ${stage.stageType}, NOW())
      `
    }

    return { pipeline_id: pipelineId, stage_id: firstStageId }
  }

  // Найти или создать фиксированную воронку "Интеграции" для B2C (франчайзи)
  private static async getOrCreateB2CIntegrationPipeline(franchiseeId: string): Promise<{ pipeline_id: string; stage_id: string }> {
    const existing = await sql`
      SELECT gp.id as pipeline_id, gps.id as stage_id
      FROM "GamePipeline" gp
      JOIN "GamePipelineStage" gps ON gps."pipelineId" = gp.id
      WHERE gp."franchiseeId" = ${franchiseeId} AND gp.name = 'Интеграции'
      ORDER BY gps."order" ASC
      LIMIT 1
    `
    if (existing.length > 0) return existing[0]

    const pipelineId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "GamePipeline" (id, name, "franchiseeId", "createdAt")
      VALUES (${pipelineId}, 'Интеграции', ${franchiseeId}, NOW())
    `

    const stages = [
      { name: "Новый", color: "#3B82F6", order: 0, stageType: "new" },
      { name: "В работе", color: "#F59E0B", order: 1, stageType: "in_progress" },
      { name: "Успешно", color: "#10B981", order: 2, stageType: "won" },
      { name: "Отказ", color: "#EF4444", order: 3, stageType: "lost" },
    ]

    let firstStageId = ""
    for (const stage of stages) {
      const stageId = globalThis.crypto.randomUUID()
      if (stage.order === 0) firstStageId = stageId
      await sql`
        INSERT INTO "GamePipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType", "createdAt")
        VALUES (${stageId}, ${pipelineId}, ${stage.name}, ${stage.color}, ${stage.order}, true, ${stage.stageType}, NOW())
      `
    }

    return { pipeline_id: pipelineId, stage_id: firstStageId }
  }

  // Найти или создать воронку "Архив" для B2C (франчайзи)
  static async getOrCreateB2CArchivePipeline(franchiseeId: string): Promise<{ pipeline_id: string; stage_id: string }> {
    const existing = await sql`
      SELECT gp.id as pipeline_id, gps.id as stage_id
      FROM "GamePipeline" gp
      JOIN "GamePipelineStage" gps ON gps."pipelineId" = gp.id
      WHERE gp."franchiseeId" = ${franchiseeId} AND gp.name = 'Архив'
      ORDER BY gps."order" ASC
      LIMIT 1
    `
    if (existing.length > 0) return existing[0]

    const pipelineId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "GamePipeline" (id, name, "franchiseeId", "createdAt")
      VALUES (${pipelineId}, 'Архив', ${franchiseeId}, NOW())
    `

    const stageId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "GamePipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType", "createdAt")
      VALUES (${stageId}, ${pipelineId}, 'Архив', '#6B7280', 0, true, 'archive', NOW())
    `

    return { pipeline_id: pipelineId, stage_id: stageId }
  }

  // Найти или создать воронку "Архив" для B2B
  static async getOrCreateB2BArchivePipeline(): Promise<{ pipeline_id: string; stage_id: string }> {
    const existing = await sql`
      SELECT p.id as pipeline_id, ps.id as stage_id
      FROM "Pipeline" p
      JOIN "PipelineStage" ps ON ps."pipelineId" = p.id
      WHERE p.name = 'Архив'
      ORDER BY ps."order" ASC
      LIMIT 1
    `
    if (existing.length > 0) return existing[0]

    const pipelineId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "Pipeline" (id, name, description, color, "isDefault", "createdAt")
      VALUES (${pipelineId}, 'Архив', 'Архивированные лиды', '#6B7280', false, NOW())
    `

    const stageId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "PipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType", "createdAt")
      VALUES (${stageId}, ${pipelineId}, 'Архив', '#6B7280', 0, true, 'archive', NOW())
    `

    return { pipeline_id: pipelineId, stage_id: stageId }
  }

  // Создать B2B Deal (для УК - продажа франшиз)
  private static async createB2BDeal(message: NormalizedMessage, integrationId: string, payloadLogId: string | null = null): Promise<string> {
    const assignee = await this.getAssignee(integrationId, "uk")
    const dealId = globalThis.crypto.randomUUID()
    const data = this.extractMessageData(message)
    const clientName = data.fullName || message.username || message.external_user_id
    const comment = `Автосоздано из ${message.channel}: ${message.message_text}`

    // Получить воронку "Интеграции" (создать если нет)
    const pipeline = await this.getOrCreateB2BIntegrationPipeline()
    if (!pipeline) {
      throw new Error("Failed to get or create B2B integration pipeline")
    }

    // Маппинг канала → leadSource для B2B CRM
    const leadSourceMap: Record<string, string> = {
      telegram: "Соцсети",
      instagram: "Соцсети",
      tilda: "Сайт",
      vk: "Соцсети",
      whatsapp: "Соцсети",
      avito: "Другое",
    }
    const leadSource = leadSourceMap[message.channel] || "Другое"
    const phone = data.clientPhone || message.phone || null

    const rawPayload = typeof message.raw_payload === "string" ? JSON.parse(message.raw_payload) : message.raw_payload
    const t = extractTracking(rawPayload)

    await sql`
      INSERT INTO "Deal" (
        id, "clientName", "contactName", "clientPhone", "contactPhone", "clientEmail",
        source, "leadSource", stage,
        "pipelineId", "stageId",
        "clientTelegram", "messengerLink", "city", "gameDate",
        "additionalComment", "responsibleId",
        "yclid", "gclid", "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "referrer",
        "payloadLogId",
        "createdAt", "updatedAt"
      ) VALUES (
        ${dealId},
        ${clientName},
        ${clientName},
        ${phone},
        ${phone},
        ${data.clientEmail},
        ${`${message.channel}_bot`},
        ${leadSource},
        'NEW',
        ${pipeline.pipeline_id},
        ${pipeline.stage_id},
        ${data.clientTelegram},
        ${data.messengerLink},
        ${data.city},
        ${data.gameDate},
        ${comment},
        ${assignee?.id || null},
        ${t.yclid}, ${t.gclid}, ${t.utmSource}, ${t.utmMedium}, ${t.utmCampaign}, ${t.utmContent}, ${t.utmTerm}, ${t.referrer},
        ${payloadLogId},
        NOW(), NOW()
      )
    `

    // Записать в DealLog
    const channelLabels: Record<string, string> = { telegram: "Telegram", instagram: "Instagram", vk: "VK", whatsapp: "WhatsApp", avito: "Авито", tilda: "Tilda (сайт)", marquiz: "Marquiz", max: "MAX" }
    const channelLabel = channelLabels[message.channel] || message.channel
    await this.logDealCreation(dealId, `Автосоздано из ${channelLabel}`, pipeline.stage_id, pipeline.pipeline_id)

    if (assignee?.id) {
      await this.sendNotification(assignee.id, dealId, clientName, message.channel, "b2b")
    }

    return dealId
  }

  // Создать B2C Lead (для франчайзи - продажа игр)
  private static async createB2CLead(message: NormalizedMessage, integrationId: string, payloadLogId: string | null = null): Promise<string> {
    const assignee = await this.getAssignee(integrationId, "franchisee")
    const franchiseeId = message.owner_id

    if (!franchiseeId) {
      throw new Error("Franchisee ID is required for B2C lead")
    }

    // Получить воронку "Интеграции" для этого франчайзи (создать если нет)
    const pipeline = await this.getOrCreateB2CIntegrationPipeline(franchiseeId)

    const leadId = globalThis.crypto.randomUUID()
    const data = this.extractMessageData(message)
    const clientName = data.fullName || message.username || message.external_user_id
    const notes = `Автосоздано из ${message.channel}: ${message.message_text}`

    const phone = data.clientPhone || message.phone || null
    const playersCount = data.playersCount || 1

    const rawPayload = typeof message.raw_payload === "string" ? JSON.parse(message.raw_payload) : message.raw_payload
    const t = extractTracking(rawPayload)

    await sql`
      INSERT INTO "GameLead" (
        id, "clientName", "clientPhone", "clientEmail", source, notes,
        "gameDate", "gameTime", "playersCount",
        "responsibleId", "pipelineId", "stageId", "franchiseeId",
        "yclid", "gclid", "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "referrer",
        "payloadLogId",
        "createdAt", "updatedAt"
      ) VALUES (
        ${leadId},
        ${clientName},
        ${phone},
        ${data.clientEmail},
        ${`${message.channel}_bot`},
        ${notes},
        ${data.gameDate},
        ${null},
        ${playersCount},
        ${assignee?.id || null},
        ${pipeline.pipeline_id},
        ${pipeline.stage_id},
        ${franchiseeId},
        ${t.yclid}, ${t.gclid}, ${t.utmSource}, ${t.utmMedium}, ${t.utmCampaign}, ${t.utmContent}, ${t.utmTerm}, ${t.referrer},
        ${payloadLogId},
        NOW(), NOW()
      )
    `

    if (assignee?.id) {
      await this.sendNotification(assignee.id, leadId, clientName, message.channel, "b2c")
    }

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

  // Записать лог создания сделки
  private static async logDealCreation(dealId: string, details: string, stageId: string | null, pipelineId: string | null) {
    try {
      const logId = globalThis.crypto.randomUUID()
      let stageName: string | null = null
      let pipelineName: string | null = null
      if (stageId) {
        const stage = await sql`SELECT name FROM "PipelineStage" WHERE id = ${stageId} LIMIT 1`
        if (stage.length > 0) stageName = stage[0].name
      }
      if (pipelineId) {
        const pipeline = await sql`SELECT name FROM "Pipeline" WHERE id = ${pipelineId} LIMIT 1`
        if (pipeline.length > 0) pipelineName = pipeline[0].name
      }
      await sql`
        INSERT INTO "DealLog" (id, "dealId", action, "toStageId", "toStageName", "pipelineId", "pipelineName", details, "userId", "userName")
        VALUES (
          ${logId}, ${dealId}, 'create',
          ${stageId}, ${stageName}, ${pipelineId}, ${pipelineName},
          ${details}, ${'system'}, ${'Интеграция'}
        )
      `
    } catch (error) {
      console.error("[v0] LeadCreator: DealLog creation failed", error)
    }
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
