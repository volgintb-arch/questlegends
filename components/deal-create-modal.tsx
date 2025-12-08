"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Save, DollarSign, User, MapPin, Phone, MessageCircle, FileText } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { RF_CITIES } from "@/lib/constants/rf-cities"

interface Deal {
  id: string
  clientName: string
  clientPhone?: string
  clientTelegram?: string
  price?: number
  stage: string
  stageId?: string
  pipelineId?: string
  location?: string
  source?: string
}

interface DealCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (deal: Deal) => void
  role: "uk" | "franchisee" | "admin" | "super_admin" | "uk_employee"
  pipelineId?: string
  initialStage?: string
  initialStageId?: string
}

export function DealCreateModal({
  isOpen,
  onClose,
  onCreate,
  role,
  pipelineId,
  initialStage,
  initialStageId,
}: DealCreateModalProps) {
  const { user, getAuthHeaders } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])

  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    clientTelegram: "",
    location: "",
    price: "",
    source: "Сайт",
    responsible: "",
    responsibleId: "",
    description: "",
  })

  useEffect(() => {
    if (isOpen && (role === "uk" || role === "super_admin" || role === "uk_employee")) {
      loadEmployees()
    }
  }, [isOpen, role])

  const loadEmployees = async () => {
    try {
      const response = await fetch("/api/users?role=uk", { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.data || data || [])
      }
    } catch (error) {
      console.error("[v0] Error loading employees:", error)
    }
  }

  if (!isOpen) return null

  const isUKRole = role === "uk" || role === "super_admin" || role === "uk_employee"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          clientName: formData.clientName,
          clientPhone: formData.clientPhone,
          clientTelegram: isUKRole ? null : formData.clientTelegram,
          location: formData.location,
          price: Number(formData.price) || null,
          stage: initialStage || "Новый",
          stageId: initialStageId,
          pipelineId: pipelineId,
          source: formData.source,
          description: formData.description,
          responsible: formData.responsible,
          responsibleId: formData.responsibleId,
          franchiseeId: isUKRole ? null : user?.franchiseeId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create deal")
      }

      const savedDeal = await response.json()

      const newDeal: Deal = {
        id: savedDeal.id,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientTelegram: formData.clientTelegram,
        price: Number(formData.price) || 0,
        stage: initialStage || "Новый",
        stageId: initialStageId,
        pipelineId: pipelineId,
        location: formData.location,
        source: formData.source,
      }

      onCreate(newDeal)
      onClose()
      setFormData({
        clientName: "",
        clientPhone: "",
        clientTelegram: "",
        location: "",
        price: "",
        source: "Сайт",
        responsible: "",
        responsibleId: "",
        description: "",
      })
    } catch (error) {
      console.error("[v0] Failed to create deal:", error)
      alert(`Ошибка при создании сделки: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResponsibleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    const selectedEmployee = employees.find((emp) => emp.id === selectedId)
    setFormData({
      ...formData,
      responsibleId: selectedId,
      responsible: selectedEmployee?.name || "",
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-lg">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h2 className="text-xs font-bold text-foreground">
            {isUKRole ? "Новая сделка по франчайзи" : "Новая сделка"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
          {/* Client Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-foreground">Имя клиента / Название *</label>
            <div className="relative">
              <User size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder={isUKRole ? "Франчайзи Москва-Юг" : "Иван Иванов"}
                className="w-full bg-background border border-border rounded pl-7 pr-2 py-1 text-xs outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-foreground">Телефон</label>
            <div className="relative">
              <Phone size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                className="w-full bg-background border border-border rounded pl-7 pr-2 py-1 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          {!isUKRole && (
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Telegram клиента</label>
              <div className="relative">
                <MessageCircle size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.clientTelegram}
                  onChange={(e) => setFormData({ ...formData, clientTelegram: e.target.value })}
                  placeholder="@username (для уведомлений)"
                  className="w-full bg-background border border-border rounded pl-7 pr-2 py-1 text-xs outline-none focus:border-primary"
                />
              </div>
              <p className="text-[9px] text-muted-foreground">Для отправки уведомлений клиенту</p>
            </div>
          )}

          {/* Location */}
          {isUKRole ? (
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Целевой город *</label>
              <div className="relative">
                <MapPin size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-background border border-border rounded pl-7 pr-2 py-1 text-xs outline-none focus:border-primary"
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
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Локация</label>
              <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs">
                <MapPin size={12} className="text-muted-foreground" />
                {user?.franchiseeName || "Не указана"}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-foreground">Бюджет (₽) *</label>
            <div className="relative">
              <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder={isUKRole ? "500000" : "45000"}
                className="w-full bg-background border border-border rounded pl-7 pr-2 py-1 text-xs outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-foreground">Источник</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs outline-none focus:border-primary"
            >
              <option value="Сайт">Сайт</option>
              <option value="Звонок">Звонок</option>
              <option value="Рекомендация">Рекомендация</option>
              <option value="Реклама">Реклама</option>
              <option value="Соцсети">Соцсети</option>
              <option value="Другое">Другое</option>
            </select>
          </div>

          {isUKRole && employees.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Ответственный</label>
              <select
                value={formData.responsibleId}
                onChange={handleResponsibleChange}
                className="w-full bg-background border border-border rounded px-2 py-1 text-xs outline-none focus:border-primary"
              >
                <option value="">Не назначен</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-foreground">Описание / Заметки</label>
            <div className="relative">
              <FileText size={12} className="absolute left-2 top-2 text-muted-foreground" />
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Дополнительная информация о сделке..."
                className="w-full bg-background border border-border rounded pl-7 pr-2 py-1 text-xs outline-none focus:border-primary min-h-[50px] resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-2 py-1 bg-muted hover:bg-muted/80 text-foreground rounded text-xs transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-2 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Save size={12} />
              {isSubmitting ? "Создание..." : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
