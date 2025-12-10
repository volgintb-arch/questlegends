"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Save, User, MapPin, Phone, FileText, DollarSign, Link } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { RF_CITIES } from "@/lib/constants/rf-cities"

interface Pipeline {
  id: string
  name: string
  stages: { id: string; name: string; order: number }[]
}

interface DealCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (deal: any) => void
  pipeline?: Pipeline | null
  role: "uk" | "franchisee" | "admin" | "super_admin" | "uk_employee"
}

export function DealCreateModal({ isOpen, onClose, onCreated, pipeline, role }: DealCreateModalProps) {
  const { user, getAuthHeaders } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])

  const [formData, setFormData] = useState({
    // Contact fields
    contactName: "",
    contactPhone: "",
    messengerLink: "",
    city: "",
    // Deal fields
    paushalnyyVznos: "",
    investmentAmount: "",
    leadSource: "Сайт",
    responsibleId: "",
    additionalComment: "",
  })

  useEffect(() => {
    if (isOpen) {
      loadEmployees()
    }
  }, [isOpen])

  const loadEmployees = async () => {
    try {
      const response = await fetch("/api/users", { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        const allUsers = data.data || data || []
        // Filter only UK staff
        const ukStaff = allUsers.filter((u: any) => ["super_admin", "uk", "uk_employee"].includes(u.role))
        setEmployees(ukStaff)
      }
    } catch (error) {
      console.error("[v0] Error loading employees:", error)
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.contactName.trim()) return

    setIsSubmitting(true)

    try {
      const initialStage = pipeline?.stages?.sort((a, b) => a.order - b.order)[0]

      const payload = {
        // Contact fields
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        messengerLink: formData.messengerLink,
        city: formData.city,
        // Deal fields
        paushalnyyVznos: formData.paushalnyyVznos ? Number(formData.paushalnyyVznos) : null,
        investmentAmount: formData.investmentAmount ? Number(formData.investmentAmount) : null,
        leadSource: formData.leadSource,
        responsibleId: formData.responsibleId || null,
        additionalComment: formData.additionalComment,
        // Pipeline
        pipelineId: pipeline?.id,
        stageId: initialStage?.id,
        stage: initialStage?.name || "Новый",
        // Legacy fields for compatibility
        clientName: formData.contactName,
        source: formData.leadSource,
      }

      const response = await fetch("/api/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create deal")
      }

      const result = await response.json()

      if (onCreated) {
        onCreated(result.data || result)
      }
      onClose()

      // Reset form
      setFormData({
        contactName: "",
        contactPhone: "",
        messengerLink: "",
        city: "",
        paushalnyyVznos: "",
        investmentAmount: "",
        leadSource: "Сайт",
        responsibleId: "",
        additionalComment: "",
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
      <div className="bg-background border border-border rounded-lg w-full max-w-lg">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h2 className="text-xs font-bold text-foreground">Новая сделка</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Contact Section */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Контактные данные</h3>

            {/* Contact Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">ФИО контакта *</label>
              <div className="relative">
                <User size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="Иванов Иван Иванович"
                  className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Contact Phone */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Номер телефона *</label>
              <div className="relative">
                <Phone size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                  className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Messenger Link */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Ссылка на мессенджер</label>
              <div className="relative">
                <Link size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.messengerLink}
                  onChange={(e) => setFormData({ ...formData, messengerLink: e.target.value })}
                  placeholder="https://t.me/username или https://wa.me/79991234567"
                  className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* City */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Город *</label>
              <div className="relative">
                <MapPin size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
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
            </div>
          </div>

          {/* Deal Section */}
          <div className="space-y-2 pt-2 border-t border-border">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Данные сделки</h3>

            {/* Paushalniy Vznos */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Паушальный взнос (₽)</label>
              <div className="relative">
                <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  value={formData.paushalnyyVznos}
                  onChange={(e) => setFormData({ ...formData, paushalnyyVznos: e.target.value })}
                  placeholder="500000"
                  className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Investment Amount */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Сумма инвестиций (₽)</label>
              <div className="relative">
                <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  value={formData.investmentAmount}
                  onChange={(e) => setFormData({ ...formData, investmentAmount: e.target.value })}
                  placeholder="1500000"
                  className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Lead Source */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Источник лида *</label>
              <select
                value={formData.leadSource}
                onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary"
                required
              >
                <option value="Сайт">Сайт</option>
                <option value="Звонок">Звонок</option>
                <option value="Рекомендация">Рекомендация</option>
                <option value="Реклама">Реклама</option>
                <option value="Соцсети">Соцсети</option>
                <option value="Выставка">Выставка</option>
                <option value="Холодный звонок">Холодный звонок</option>
                <option value="Партнер">Партнер</option>
                <option value="Другое">Другое</option>
              </select>
            </div>

            {/* Responsible */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Ответственный (сотрудник УК)</label>
              <select
                value={formData.responsibleId}
                onChange={(e) => setFormData({ ...formData, responsibleId: e.target.value })}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary"
              >
                <option value="">Не назначен</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role === "super_admin" ? "Супер Админ" : emp.role === "uk" ? "УК" : "Сотрудник УК"}
                    )
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Comment */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Дополнительный комментарий</label>
              <div className="relative">
                <FileText size={12} className="absolute left-2 top-2 text-muted-foreground" />
                <textarea
                  value={formData.additionalComment}
                  onChange={(e) => setFormData({ ...formData, additionalComment: e.target.value })}
                  placeholder="Дополнительная информация о сделке..."
                  className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary min-h-[60px] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-2 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded text-xs transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-2 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Save size={12} />
              {isSubmitting ? "Создание..." : "Создать сделку"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
