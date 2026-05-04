// Единый справочник источников лидов (B2B и B2C)
// Используется в карточках лидов, формах создания и маркетинговом отчёте
export const LEAD_SOURCES = [
  "Сайт",
  "Звонок",
  "Холодный звонок",
  "Рекомендация",
  "Реклама",
  "Соцсети",
  "Выставка",
  "Партнер",
  "2GIS",
  "Marquiz",
  "Tilda",
  "Telegram",
  "Instagram",
  "VK",
  "WhatsApp",
  "Avito",
  "Другое",
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

/**
 * Приводит произвольное значение источника к каноническому из LEAD_SOURCES.
 * Объединяет дубли вида "2 ГИС / 2ГИС / 2Гис", "Marquiz / marquiz_bot / Квиз" и т.п.
 */
export function normalizeSource(raw: string | null | undefined): string {
  if (!raw) return "(не указан)"
  const s = raw.trim().toLowerCase().replace(/[\s_-]+/g, " ")

  // 2GIS / 2 ГИС / 2Гис
  if (/^2\s*гис$|^2\s*gis$/i.test(s)) return "2GIS"

  // Marquiz / квиз
  if (s.includes("marquiz") || s.includes("маркв") || s === "квиз" || s.includes("марквиз")) return "Marquiz"

  // Tilda / Тильда / Заявка с сайта
  if (s.includes("tilda") || s.includes("тильд")) return "Tilda"

  // Сайт / заявка с сайта
  if (s.includes("сайт") || s.includes("заявка")) return "Сайт"

  // Telegram
  if (s.includes("telegram") || s.includes("телеграм")) return "Telegram"

  // Instagram
  if (s.includes("instagram") || s.includes("инстаграм") || s.includes("инст")) return "Instagram"

  // VK / Вконтакте
  if (s === "vk" || s.startsWith("vk ") || s.includes("вконтакте") || s.includes("вк")) return "VK"

  // WhatsApp
  if (s.includes("whatsapp") || s.includes("вотсап") || s.includes("ватсап")) return "WhatsApp"

  // Avito / Авито
  if (s.includes("avito") || s.includes("авито")) return "Avito"

  // Звонок
  if (s.includes("холодн") && s.includes("звон")) return "Холодный звонок"
  if (s.includes("звонок") || s.includes("звон ")) return "Звонок"

  // Рекомендация / порекомендовали / сарафан
  if (s.includes("рекоменд") || s.includes("порекомендов") || s.includes("сарафан")) return "Рекомендация"

  // Реклама
  if (s.includes("реклам") || s.includes("ads") || s.includes("яндекс")) return "Реклама"

  // Соцсети (общее)
  if (s.includes("соцсет") || s.includes("соц сет") || s.includes("facebook") || s.includes("фейсбук")) return "Соцсети"

  // Выставка
  if (s.includes("выставк") || s.includes("ярмарк") || s.includes("event")) return "Выставка"

  // Партнер
  if (s.includes("партн") || s.includes("partner")) return "Партнер"

  // Всё остальное → Другое
  return "Другое"
}

/**
 * @deprecated Используй normalizeSource() — она и нормализует, и подписывает.
 * Оставлено для обратной совместимости.
 */
export function prettifySource(raw: string | null | undefined): string {
  return normalizeSource(raw)
}
