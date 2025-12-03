"use client"

import { useState } from "react"
import { X, User, Phone, Mail, MessageCircle, Save } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface ProfileSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || "",
    phone: user.phone || "",
    telegram_id: user.telegram_id || "",
  })
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    console.log("[v0] Saving profile settings:", formData)

    // await fetch('/api/auth/profile', {
    //   method: 'PUT',
    //   headers: { 'Authorization': `Bearer ${token}` },
    //   body: JSON.stringify(formData)
    // })

    setTimeout(() => {
      setIsSaving(false)
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Настройки профиля</h2>
              <p className="text-sm text-muted-foreground">Обновите ваши личные данные</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">
              {formData.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-foreground">{formData.name}</p>
              <p className="text-sm text-muted-foreground">{user.role}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <User size={16} className="text-muted-foreground" />
                Полное имя
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                placeholder="Введите ваше имя"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Mail size={16} className="text-muted-foreground" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Phone size={16} className="text-muted-foreground" />
                Телефон
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <MessageCircle size={16} className="text-blue-500" />
                Telegram ID
              </label>
              <input
                type="text"
                value={formData.telegram_id}
                onChange={(e) => setFormData({ ...formData, telegram_id: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors mb-2"
                placeholder="@username или ID"
              />
              <p className="text-xs text-muted-foreground">
                Укажите ваш Telegram ID для получения уведомлений о назначениях на игры и важных событиях. Чтобы узнать
                ваш ID, напишите боту @userinfobot
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-muted/50 rounded-lg transition-colors text-sm text-foreground"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </div>
    </div>
  )
}
