"use client"

import type React from "react"

import { useState } from "react"
import { X, Save, DollarSign, User, MapPin, Package, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { RF_CITIES } from "@/lib/constants/rf-cities"

interface Deal {
  id: string
  title: string
  location: string
  amount: string
  daysOpen: number
  priority?: "high" | "normal"
  participants?: number
  package?: string
  checkPerPerson?: number
  animatorsCount?: number
  animatorRate?: number
  hostRate?: number
  djRate?: number
  contactTelegram?: string
  contactWhatsapp?: string
}

interface DealCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (deal: Deal) => void
  role: "uk" | "franchisee" | "admin"
}

export function DealCreateModal({ isOpen, onClose, onCreate, role }: DealCreateModalProps) {
  const { user, franchisees } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    location: role === "uk" ? "" : user.franchiseeName || "",
    amount: "",
    priority: "normal" as "high" | "normal",
    participants: 0,
    package: "",
    source: "Сайт",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contactTelegram: "", // Added Telegram field
    contactWhatsapp: "", // Added WhatsApp field
    checkPerPerson: 0,
    animatorsCount: 0,
    animatorRate: 0,
    hostRate: 0,
    djRate: 0,
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: formData.title,
          clientPhone: formData.contactPhone,
          clientTelegram: formData.contactTelegram,
          clientWhatsapp: formData.contactWhatsapp,
          gameType: formData.package,
          location: formData.location,
          participants: formData.participants || null,
          packageType: formData.package || null,
          price: Number(formData.amount) || null,
          stage: "NEW",
          source: formData.source,
          description: `Чек: ${formData.checkPerPerson}₽, Аниматоры: ${formData.animatorsCount}, Ставка аниматора: ${formData.animatorRate}₽, Ставка ведущего: ${formData.hostRate}₽, Ставка DJ: ${formData.djRate}₽`,
          franchiseeId: role === "uk" ? formData.location : user.franchiseeId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create deal")
      }

      const savedDeal = await response.json()
      console.log("[v0] Deal created successfully:", savedDeal.id)

      // Convert saved deal to UI format and pass to parent
      const newDeal: Deal = {
        id: savedDeal.id,
        title: formData.title,
        location: formData.location,
        amount: `${Number(formData.amount).toLocaleString()} ₽`,
        daysOpen: 0,
        priority: formData.priority,
        participants: formData.participants,
        package: formData.package,
        checkPerPerson: formData.checkPerPerson,
        animatorsCount: formData.animatorsCount,
        animatorRate: formData.animatorRate,
        hostRate: formData.hostRate,
        djRate: formData.djRate,
        contactTelegram: formData.contactTelegram,
        contactWhatsapp: formData.contactWhatsapp,
      }

      onCreate(newDeal)
      onClose()
      setFormData({
        title: "",
        location: role === "uk" ? "" : user.franchiseeName || "",
        amount: "",
        priority: "normal",
        participants: 0,
        package: "",
        source: "Сайт",
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        contactTelegram: "",
        contactWhatsapp: "",
        checkPerPerson: 0,
        animatorsCount: 0,
        animatorRate: 0,
        hostRate: 0,
        djRate: 0,
      })
    } catch (error) {
      console.error("[v0] Failed to create deal:", error)
      alert(`Ошибка при создании сделки: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {role === "uk" ? "Новая сделка по франчайзи" : "Новая игра / Клиент"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Название сделки *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={role === "uk" ? "Франчайзи Москва-Юг" : "Корпоратив TechCorp"}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              required
            />
          </div>

          {/* Location */}
          {role === "uk" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Локация *</label>
              <div className="relative">
                <MapPin
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none"
                />
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-primary"
                  required
                >
                  <option value="">Выберите город</option>
                  {RF_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">Города РФ с населением более 200 тысяч человек</p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Локация</label>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                <MapPin size={16} className="text-muted-foreground" />
                <span className="text-sm text-foreground">{formData.location}</span>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Сумма сделки (₽) *</label>
            <div className="relative">
              <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder={role === "uk" ? "500000" : "45000"}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          {/* Participants (for franchisee/admin only) */}
          {role !== "uk" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Количество участников *</label>
              <div className="relative">
                <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  value={formData.participants}
                  onChange={(e) => setFormData({ ...formData, participants: Number(e.target.value) })}
                  placeholder="15"
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-primary"
                  required
                />
              </div>
            </div>
          )}

          {/* Package (for franchisee/admin only) */}
          {role !== "uk" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Выбранный пакет</label>
              <div className="relative">
                <Package size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={formData.package}
                  onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-primary appearance-none"
                >
                  <option value="">Выберите пакет</option>
                  <option value="Стандарт">Стандарт</option>
                  <option value="Премиум">Премиум</option>
                  <option value="VIP">VIP</option>
                  <option value="Образовательный">Образовательный</option>
                </select>
              </div>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Приоритет</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as "high" | "normal" })}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="normal">Обычный</option>
              <option value="high">Высокий</option>
            </select>
          </div>

          {/* Contact Information */}
          <div className="pt-4 border-t border-border space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Контактная информация</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Имя контакта</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="Иван Иванов"
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Телефон</label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="client@example.com"
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Telegram</label>
                <input
                  type="text"
                  value={formData.contactTelegram}
                  onChange={(e) => setFormData({ ...formData, contactTelegram: e.target.value })}
                  placeholder="@username"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">WhatsApp</label>
                <input
                  type="tel"
                  value={formData.contactWhatsapp}
                  onChange={(e) => setFormData({ ...formData, contactWhatsapp: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Calculation Parameters (for franchisee and admin) */}
          {role !== "uk" && (
            <div className="pt-4 border-t border-border space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Расчетные Параметры</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Чек на человека (₽)</label>
                  <input
                    type="number"
                    value={formData.checkPerPerson}
                    onChange={(e) => setFormData({ ...formData, checkPerPerson: Number(e.target.value) })}
                    placeholder="3000"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">К-во Аниматоров</label>
                  <input
                    type="number"
                    value={formData.animatorsCount}
                    onChange={(e) => setFormData({ ...formData, animatorsCount: Number(e.target.value) })}
                    placeholder="2"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Ставка Аниматора (₽)</label>
                  <input
                    type="number"
                    value={formData.animatorRate}
                    onChange={(e) => setFormData({ ...formData, animatorRate: Number(e.target.value) })}
                    placeholder="1500"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Ставка Ведущего (₽)</label>
                  <input
                    type="number"
                    value={formData.hostRate}
                    onChange={(e) => setFormData({ ...formData, hostRate: Number(e.target.value) })}
                    placeholder="2000"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium text-foreground">Ставка DJ (₽)</label>
                  <input
                    type="number"
                    value={formData.djRate}
                    onChange={(e) => setFormData({ ...formData, djRate: Number(e.target.value) })}
                    placeholder="2500"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              <span>{isSubmitting ? "Создание..." : "Создать сделку"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
