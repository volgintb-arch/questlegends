// Trigger keywords for auto-lead creation
const DEFAULT_TRIGGERS = [
  "хочу квест",
  "записаться",
  "день рождения",
  "корпоратив",
  "цены",
  "свободно ли",
  "забронировать",
  "стоимость",
  "квест",
  "лазертаг",
  "аниматор",
  "ведущий",
  "празднование",
  "мероприятие",
  "игра",
]

interface IncomingMessage {
  source: "whatsapp" | "telegram" | "vk" | "instagram"
  senderId: string
  senderName?: string
  senderPhone?: string
  text: string
  franchiseeId: string
  timestamp: string
  chatUrl?: string
}
