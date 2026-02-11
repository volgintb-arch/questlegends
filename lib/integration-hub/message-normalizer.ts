// Message Normalizer - приводит все сообщения к единому формату
export interface NormalizedMessage {
  channel: "telegram" | "instagram" | "vk" | "whatsapp" | "avito"
  external_user_id: string
  username?: string
  phone?: string
  message_text: string
  attachments?: Array<{
    type: "image" | "video" | "document" | "audio"
    url: string
    filename?: string
  }>
  owner_type: "uk" | "franchisee"
  owner_id?: string
  received_at: Date
  raw_payload: any
}

export class MessageNormalizer {
  // Нормализация Telegram сообщения
  static normalizeTelegram(update: any, integration: any): NormalizedMessage {
    const message = update.message || update.edited_message

    return {
      channel: "telegram",
      external_user_id: message.from.id.toString(),
      username: message.from.username || `${message.from.first_name} ${message.from.last_name || ""}`.trim(),
      phone: message.contact?.phone_number,
      message_text: message.text || message.caption || "",
      attachments: this.extractTelegramAttachments(message),
      owner_type: integration.owner_type,
      owner_id: integration.owner_id,
      received_at: new Date(message.date * 1000),
      raw_payload: update,
    }
  }

  // Нормализация Instagram Direct сообщения
  static normalizeInstagram(webhook: any, integration: any): NormalizedMessage {
    const entry = webhook.entry[0]
    const messaging = entry.messaging[0]
    const sender = messaging.sender
    const message = messaging.message

    return {
      channel: "instagram",
      external_user_id: sender.id,
      username: sender.username,
      message_text: message.text || "",
      attachments: this.extractInstagramAttachments(message),
      owner_type: integration.owner_type,
      owner_id: integration.owner_id,
      received_at: new Date(messaging.timestamp),
      raw_payload: webhook,
    }
  }

  // Нормализация VK сообщения
  static normalizeVK(update: any, integration: any): NormalizedMessage {
    const message = update.object.message

    return {
      channel: "vk",
      external_user_id: message.from_id.toString(),
      message_text: message.text || "",
      attachments: this.extractVKAttachments(message),
      owner_type: integration.owner_type,
      owner_id: integration.owner_id,
      received_at: new Date(message.date * 1000),
      raw_payload: update,
    }
  }

  // Нормализация WhatsApp сообщения
  static normalizeWhatsApp(webhook: any, integration: any): NormalizedMessage {
    const message = webhook.entry[0].changes[0].value.messages[0]
    const contact = webhook.entry[0].changes[0].value.contacts[0]

    return {
      channel: "whatsapp",
      external_user_id: message.from,
      username: contact.profile?.name,
      phone: message.from,
      message_text: message.text?.body || message.caption || "",
      attachments: this.extractWhatsAppAttachments(message),
      owner_type: integration.owner_type,
      owner_id: integration.owner_id,
      received_at: new Date(Number.parseInt(message.timestamp) * 1000),
      raw_payload: webhook,
    }
  }

  // Нормализация Avito сообщения
  static normalizeAvito(message: any, integration: any): NormalizedMessage {
    return {
      channel: "avito",
      external_user_id: message.user_id.toString(),
      username: message.user_name,
      phone: message.phone,
      message_text: message.text || "",
      owner_type: integration.owner_type,
      owner_id: integration.owner_id,
      received_at: new Date(message.created_at),
      raw_payload: message,
    }
  }

  // Нормализация MAX мессенджер сообщения
  static normalizeMAX(message: any, integration: any): NormalizedMessage {
    return {
      channel: "max",
      external_user_id: message.sender_id.toString(),
      username: message.sender_name,
      phone: message.phone,
      message_text: message.content || "",
      attachments: message.files?.map((file: any) => ({
        type: this.detectFileType(file.mime_type),
        url: file.url,
        filename: file.name,
      })),
      owner_type: integration.owner_type,
      owner_id: integration.owner_id,
      received_at: new Date(message.timestamp),
      raw_payload: message,
    }
  }

  // Извлечение вложений из Telegram
  private static extractTelegramAttachments(message: any) {
    const attachments = []

    if (message.photo) {
      const photo = message.photo[message.photo.length - 1]
      attachments.push({ type: "image" as const, url: photo.file_id })
    }
    if (message.video) {
      attachments.push({ type: "video" as const, url: message.video.file_id })
    }
    if (message.document) {
      attachments.push({
        type: "document" as const,
        url: message.document.file_id,
        filename: message.document.file_name,
      })
    }
    if (message.voice) {
      attachments.push({ type: "audio" as const, url: message.voice.file_id })
    }

    return attachments.length > 0 ? attachments : undefined
  }

  // Извлечение вложений из Instagram
  private static extractInstagramAttachments(message: any) {
    const attachments = []

    if (message.attachments) {
      for (const att of message.attachments) {
        if (att.type === "image") {
          attachments.push({ type: "image" as const, url: att.payload.url })
        } else if (att.type === "video") {
          attachments.push({ type: "video" as const, url: att.payload.url })
        }
      }
    }

    return attachments.length > 0 ? attachments : undefined
  }

  // Извлечение вложений из VK
  private static extractVKAttachments(message: any) {
    const attachments = []

    if (message.attachments) {
      for (const att of message.attachments) {
        if (att.type === "photo") {
          attachments.push({ type: "image" as const, url: att.photo.sizes[att.photo.sizes.length - 1].url })
        } else if (att.type === "video") {
          attachments.push({ type: "video" as const, url: att.video.player })
        } else if (att.type === "doc") {
          attachments.push({ type: "document" as const, url: att.doc.url, filename: att.doc.title })
        }
      }
    }

    return attachments.length > 0 ? attachments : undefined
  }

  // Извлечение вложений из WhatsApp
  private static extractWhatsAppAttachments(message: any) {
    const attachments = []

    if (message.image) {
      attachments.push({ type: "image" as const, url: message.image.id })
    } else if (message.video) {
      attachments.push({ type: "video" as const, url: message.video.id })
    } else if (message.document) {
      attachments.push({ type: "document" as const, url: message.document.id, filename: message.document.filename })
    } else if (message.audio) {
      attachments.push({ type: "audio" as const, url: message.audio.id })
    }

    return attachments.length > 0 ? attachments : undefined
  }

  // Определение типа файла по MIME
  private static detectFileType(mimeType: string): "image" | "video" | "document" | "audio" {
    if (mimeType.startsWith("image/")) return "image"
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    return "document"
  }
}
