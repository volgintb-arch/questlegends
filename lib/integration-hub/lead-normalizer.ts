// Lead Normalizer - нормализация данных лидов из разных источников
import type { NormalizedMessage } from "./message-normalizer"

export interface NormalizedLead {
  // Контактные данные
  name: string
  phone: string | null
  email: string | null

  // Социальные сети
  telegram_id: string | null
  instagram_username: string | null
  vk_id: string | null
  whatsapp_id: string | null

  // Метаданные
  source: string
  source_channel: string
  external_user_id: string

  // Контент
  first_message: string

  // Владелец
  owner_type: "uk" | "franchisee"
  owner_id: string | null
}

export class LeadNormalizer {
  /**
   * Нормализует данные из NormalizedMessage в NormalizedLead
   */
  static fromMessage(message: NormalizedMessage): NormalizedLead {
    return {
      name: this.extractName(message),
      phone: this.normalizePhone(message.phone),
      email: null,

      telegram_id: message.channel === "telegram" ? message.external_user_id : null,
      instagram_username: message.channel === "instagram" ? message.external_user_id : null,
      vk_id: message.channel === "vk" ? message.external_user_id : null,
      whatsapp_id: message.channel === "whatsapp" ? message.external_user_id : null,

      source: `${message.channel}_integration`,
      source_channel: message.channel,
      external_user_id: message.external_user_id,

      first_message: message.message_text,

      owner_type: message.owner_type as "uk" | "franchisee",
      owner_id: message.owner_id,
    }
  }

  /**
   * Извлекает имя из сообщения
   */
  private static extractName(message: NormalizedMessage): string {
    // Приоритет: username > first_name + last_name > external_user_id
    if (message.username) {
      return message.username
    }

    // Попытка извлечь из raw_payload
    const payload = message.raw_payload
    if (payload?.from?.first_name) {
      const firstName = payload.from.first_name
      const lastName = payload.from.last_name || ""
      return `${firstName} ${lastName}`.trim()
    }

    return `${message.channel}_user_${message.external_user_id.substring(0, 8)}`
  }

  /**
   * Нормализует телефон к единому формату
   */
  static normalizePhone(phone: string | null | undefined): string | null {
    if (!phone) return null

    // Удаляем все нецифровые символы кроме +
    let normalized = phone.replace(/[^\d+]/g, "")

    // Если начинается с 8, заменяем на +7 (Россия)
    if (normalized.startsWith("8") && normalized.length === 11) {
      normalized = "+7" + normalized.substring(1)
    }

    // Если нет + в начале, добавляем
    if (!normalized.startsWith("+")) {
      // Предполагаем российский номер если 10-11 цифр
      if (normalized.length === 10) {
        normalized = "+7" + normalized
      } else if (normalized.length === 11 && normalized.startsWith("7")) {
        normalized = "+" + normalized
      }
    }

    // Валидация - минимум 10 цифр
    const digits = normalized.replace(/\D/g, "")
    if (digits.length < 10) {
      return null
    }

    return normalized
  }

  /**
   * Нормализует email
   */
  static normalizeEmail(email: string | null | undefined): string | null {
    if (!email) return null

    const normalized = email.toLowerCase().trim()

    // Простая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalized)) {
      return null
    }

    return normalized
  }

  /**
   * Извлекает телефон из текста сообщения
   */
  static extractPhoneFromText(text: string): string | null {
    // Паттерны для поиска телефонов
    const patterns = [
      /\+7\s?$$?\d{3}$$?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}/g, // +7 (XXX) XXX-XX-XX
      /8\s?$$?\d{3}$$?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}/g, // 8 (XXX) XXX-XX-XX
      /\+7\d{10}/g, // +7XXXXXXXXXX
      /8\d{10}/g, // 8XXXXXXXXXX
    ]

    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches && matches.length > 0) {
        return this.normalizePhone(matches[0])
      }
    }

    return null
  }

  /**
   * Извлекает email из текста сообщения
   */
  static extractEmailFromText(text: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const matches = text.match(emailRegex)

    if (matches && matches.length > 0) {
      return this.normalizeEmail(matches[0])
    }

    return null
  }

  /**
   * Обогащает лид данными из текста сообщения
   */
  static enrichFromText(lead: NormalizedLead, text: string): NormalizedLead {
    // Извлекаем телефон если не был передан
    if (!lead.phone) {
      lead.phone = this.extractPhoneFromText(text)
    }

    // Извлекаем email если не был передан
    if (!lead.email) {
      lead.email = this.extractEmailFromText(text)
    }

    return lead
  }

  /**
   * Проверяет минимальную валидность лида
   */
  static isValid(lead: NormalizedLead): boolean {
    // Должно быть хотя бы имя и один способ связи
    if (!lead.name || lead.name.trim() === "") {
      return false
    }

    const hasContact = !!(
      lead.phone ||
      lead.email ||
      lead.telegram_id ||
      lead.instagram_username ||
      lead.vk_id ||
      lead.whatsapp_id
    )

    return hasContact
  }
}
