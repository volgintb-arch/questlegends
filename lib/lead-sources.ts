// Единый справочник источников лидов (B2B и B2C)
// Используется в карточках лидов, формах создания и маркетинговом отчёте
export const LEAD_SOURCES = [
  "Сайт",
  "Звонок",
  "Рекомендация",
  "Реклама",
  "Соцсети",
  "Выставка",
  "Холодный звонок",
  "Партнер",
  "Интеграция",
  "Другое",
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

// Маппинг интеграционных каналов (marquiz_bot, tilda_bot и т.п.) на человекочитаемые ярлыки
export const INTEGRATION_SOURCE_LABELS: Record<string, string> = {
  marquiz_bot: "Marquiz",
  tilda_bot: "Tilda",
  telegram_bot: "Telegram",
  instagram_bot: "Instagram",
  vk_bot: "VK",
  whatsapp_bot: "WhatsApp",
  avito_bot: "Avito",
  max_bot: "MAX",
}

export function prettifySource(raw: string | null | undefined): string {
  if (!raw) return "(не указан)"
  return INTEGRATION_SOURCE_LABELS[raw] || raw
}
