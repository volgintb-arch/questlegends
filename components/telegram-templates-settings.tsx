"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Save, Power, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface TelegramTemplate {
  id: string
  type: "TWO_DAYS_BEFORE" | "AFTER_GAME"
  message: string
  isActive: boolean
}

export function TelegramTemplatesSettings() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<TelegramTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [twoDaysBeforeMsg, setTwoDaysBeforeMsg] = useState("")
  const [afterGameMsg, setAfterGameMsg] = useState("")

  useEffect(() => {
    if (user?.role === "franchisee" || user?.role === "admin") {
      fetchTemplates()
    }
  }, [user])

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/telegram-templates")
      const data = await response.json()

      if (data.success) {
        setTemplates(data.data)

        const twoDaysBefore = data.data.find((t: TelegramTemplate) => t.type === "TWO_DAYS_BEFORE")
        const afterGame = data.data.find((t: TelegramTemplate) => t.type === "AFTER_GAME")

        setTwoDaysBeforeMsg(twoDaysBefore?.message || "")
        setAfterGameMsg(afterGame?.message || "")
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveTemplate = async (type: "TWO_DAYS_BEFORE" | "AFTER_GAME", message: string) => {
    setSaving(true)
    try {
      const response = await fetch("/api/telegram-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchTemplates()
      }
    } catch (error) {
      console.error("Failed to save template:", error)
    } finally {
      setSaving(false)
    }
  }

  const toggleTemplate = async (templateId: string, isActive: boolean) => {
    try {
      await fetch(`/api/telegram-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })

      await fetchTemplates()
    } catch (error) {
      console.error("Failed to toggle template:", error)
    }
  }

  if (user?.role !== "franchisee" && user?.role !== "admin") {
    return null
  }

  if (loading) {
    return (
      <div className="p-6 bg-card border border-border rounded-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  const twoDaysTemplate = templates.find((t) => t.type === "TWO_DAYS_BEFORE")
  const afterGameTemplate = templates.find((t) => t.type === "AFTER_GAME")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare size={24} className="text-primary" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Шаблоны Telegram уведомлений</h2>
          <p className="text-sm text-muted-foreground">Настройте автоматические уведомления для клиентов</p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <AlertCircle size={20} className="text-blue-500 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm text-foreground font-medium">Доступные переменные:</p>
          <p className="text-xs text-muted-foreground">
            <code className="bg-muted px-1 py-0.5 rounded">{"{ clientName}"}</code> - имя клиента,{" "}
            <code className="bg-muted px-1 py-0.5 rounded">{"{ gameDate}"}</code> - дата игры,{" "}
            <code className="bg-muted px-1 py-0.5 rounded">{"{ participants}"}</code> - количество участников
          </p>
        </div>
      </div>

      {/* Two Days Before Template */}
      <div className="p-6 bg-card border border-border rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Уведомление за 2 дня до игры</h3>
            <p className="text-sm text-muted-foreground">Отправляется автоматически за 48 часов до начала игры</p>
          </div>
          {twoDaysTemplate && (
            <button
              onClick={() => toggleTemplate(twoDaysTemplate.id, twoDaysTemplate.isActive)}
              className={`p-2 rounded-lg transition-colors ${
                twoDaysTemplate.isActive
                  ? "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Power size={18} />
            </button>
          )}
        </div>

        <textarea
          value={twoDaysBeforeMsg}
          onChange={(e) => setTwoDaysBeforeMsg(e.target.value)}
          placeholder="Здравствуйте, {clientName}! Напоминаем о вашей игре {gameDate}. Количество участников: {participants}. Ждем вас!"
          className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-primary resize-none"
          rows={4}
        />

        <button
          onClick={() => saveTemplate("TWO_DAYS_BEFORE", twoDaysBeforeMsg)}
          disabled={saving || !twoDaysBeforeMsg}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          <span>Сохранить</span>
        </button>
      </div>

      {/* After Game Template */}
      <div className="p-6 bg-card border border-border rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Уведомление после игры</h3>
            <p className="text-sm text-muted-foreground">
              Отправляется автоматически после завершения игры (статус "Завершено")
            </p>
          </div>
          {afterGameTemplate && (
            <button
              onClick={() => toggleTemplate(afterGameTemplate.id, afterGameTemplate.isActive)}
              className={`p-2 rounded-lg transition-colors ${
                afterGameTemplate.isActive
                  ? "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Power size={18} />
            </button>
          )}
        </div>

        <textarea
          value={afterGameMsg}
          onChange={(e) => setAfterGameMsg(e.target.value)}
          placeholder="Спасибо, что посетили нашу игру, {clientName}! Надеемся, вам понравилось. Пожалуйста, оставьте отзыв."
          className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-primary resize-none"
          rows={4}
        />

        <button
          onClick={() => saveTemplate("AFTER_GAME", afterGameMsg)}
          disabled={saving || !afterGameMsg}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          <span>Сохранить</span>
        </button>
      </div>
    </div>
  )
}
