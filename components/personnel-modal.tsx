"use client"

import { useState, useEffect } from "react"
import { X, User, Phone, Mail, MapPin, Clock, MessageCircle, Save } from "lucide-react"

interface Staff {
  id: string
  name: string
  role: string
  phone: string
  email: string
  location: string
  schedule: string
  status: "active" | "on_leave" | "inactive"
  joinDate: string
  telegram_id?: string
}

interface PersonnelModalProps {
  isOpen: boolean
  staff: Staff | null
  onClose: () => void
  onSave: (data: any) => void
}

export function PersonnelModal({ isOpen, staff, onClose, onSave }: PersonnelModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    role: "Аниматор",
    phone: "",
    email: "",
    location: "",
    schedule: "",
    status: "active" as const,
    telegram_id: "",
  })

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name,
        role: staff.role,
        phone: staff.phone,
        email: staff.email,
        location: staff.location,
        schedule: staff.schedule,
        status: staff.status,
        telegram_id: staff.telegram_id || "",
      })
    } else {
      setFormData({
        name: "",
        role: "Аниматор",
        phone: "",
        email: "",
        location: "",
        schedule: "",
        status: "active",
        telegram_id: "",
      })
    }
  }, [staff, isOpen])

  if (!isOpen) return null

  const roleOptions = ["Аниматор", "Ведущий", "DJ", "Администратор", "Менеджер"]
  const statusOptions = [
    { value: "active", label: "Активен" },
    { value: "on_leave", label: "В отпуске" },
    { value: "inactive", label: "Неактивен" },
  ]

  const handleSubmit = () => {
    console.log("[v0] Submitting personnel data:", formData)
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {staff ? "Редактировать сотрудника" : "Добавить сотрудника"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {staff ? "Обновите информацию о сотруднике" : "Заполните данные нового сотрудника"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <User size={16} className="text-muted-foreground" />
                Полное имя
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Иван Иванов"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Роль</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
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
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="+7 (999) 123-45-67"
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
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-muted-foreground" />
                Локация
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Москва"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Статус</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Clock size={16} className="text-muted-foreground" />
                График работы
              </label>
              <input
                type="text"
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Пн-Пт 10:00-18:00"
              />
            </div>

            <div className="md:col-span-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <MessageCircle size={16} className="text-blue-500" />
                Telegram ID (для уведомлений)
              </label>
              <input
                type="text"
                value={formData.telegram_id}
                onChange={(e) => setFormData({ ...formData, telegram_id: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary mb-2"
                placeholder="@username или ID"
              />
              <p className="text-xs text-muted-foreground">
                При назначении на игру сотрудник получит уведомление в Telegram. Узнать ID: @userinfobot
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
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm"
          >
            <Save size={16} />
            {staff ? "Сохранить изменения" : "Добавить сотрудника"}
          </button>
        </div>
      </div>
    </div>
  )
}
