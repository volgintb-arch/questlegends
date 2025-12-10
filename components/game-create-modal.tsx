"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Save, User, Phone, Calendar, Users, DollarSign, FileText, Clock, Mic, Music } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Stage {
  id: string
  name: string
  order: number
}

interface GameCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  onCreated?: (game: any) => void
  pipelineId?: string
  stages?: Stage[]
  franchiseeId?: string
  pipeline?: { id: string; name: string; stages: Stage[] } | null
}

export function GameCreateModal({
  isOpen,
  onClose,
  onSuccess,
  onCreated,
  pipelineId,
  stages: propStages,
  franchiseeId: propFranchiseeId,
  pipeline,
}: GameCreateModalProps) {
  const { user, getAuthHeaders } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])

  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    gameDate: "",
    gameTime: "14:00",
    playersCount: "10",
    packagePrice: "1500",
    prepayment: "0",
    notes: "",
    responsibleId: "",
    animatorsCount: "0",
    animatorRate: "1500",
    hostsCount: "0",
    hostRate: "2000",
    djsCount: "0",
    djRate: "2500",
  })

  const totalAmount = Number(formData.playersCount) * Number(formData.packagePrice)
  const staffCost =
    Number(formData.animatorsCount) * Number(formData.animatorRate) +
    Number(formData.hostsCount) * Number(formData.hostRate) +
    Number(formData.djsCount) * Number(formData.djRate)
  const profit = totalAmount - staffCost

  const actualPipelineId = pipelineId || pipeline?.id
  const actualStages = propStages || pipeline?.stages || []
  const actualFranchiseeId = propFranchiseeId || user?.franchiseeId

  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen])

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users?roles=franchisee,admin", { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data || data.users || [])
      }
    } catch (error) {
      console.error("[v0] Error loading users:", error)
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.clientName.trim() || !formData.gameDate) return

    setIsSubmitting(true)

    try {
      const sortedStages = [...actualStages].sort((a, b) => a.order - b.order)
      const initialStage = sortedStages[0]

      const payload = {
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        gameDate: formData.gameDate,
        gameTime: formData.gameTime,
        playersCount: Number(formData.playersCount),
        pricePerPerson: Number(formData.packagePrice),
        totalAmount: totalAmount,
        prepayment: Number(formData.prepayment),
        notes: formData.notes,
        responsibleId: formData.responsibleId || null,
        pipelineId: actualPipelineId,
        stageId: initialStage?.id,
        franchiseeId: actualFranchiseeId,
        animatorsCount: Number(formData.animatorsCount),
        animatorRate: Number(formData.animatorRate),
        hostsCount: Number(formData.hostsCount),
        hostRate: Number(formData.hostRate),
        djsCount: Number(formData.djsCount),
        djRate: Number(formData.djRate),
      }

      const response = await fetch("/api/game-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create game")
      }

      const result = await response.json()

      if (onCreated) {
        onCreated(result.data || result)
      }
      if (onSuccess) {
        onSuccess()
      }
      onClose()

      setFormData({
        clientName: "",
        clientPhone: "",
        gameDate: "",
        gameTime: "14:00",
        playersCount: "10",
        packagePrice: "1500",
        prepayment: "0",
        notes: "",
        responsibleId: "",
        animatorsCount: "0",
        animatorRate: "1500",
        hostsCount: "0",
        hostRate: "2000",
        djsCount: "0",
        djRate: "2500",
      })
    } catch (error) {
      console.error("[v0] Failed to create game:", error)
      alert(`Ошибка при создании заявки: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-lg">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h2 className="text-xs font-bold text-foreground">Новая заявка на игру</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Client Section */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Клиент</h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground">ФИО клиента *</label>
                <div className="relative">
                  <User size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Иванов Иван"
                    className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground">Телефон</label>
                <div className="relative">
                  <Phone size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                    className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Game Section */}
          <div className="space-y-2 pt-2 border-t border-border">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Данные игры</h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground">Дата игры *</label>
                <div className="relative">
                  <Calendar size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    value={formData.gameDate}
                    onChange={(e) => setFormData({ ...formData, gameDate: e.target.value })}
                    className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground">Время начала</label>
                <div className="relative">
                  <Clock size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="time"
                    value={formData.gameTime}
                    onChange={(e) => setFormData({ ...formData, gameTime: e.target.value })}
                    className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground">Количество игроков *</label>
                <div className="relative">
                  <Users size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    min="1"
                    value={formData.playersCount}
                    onChange={(e) => setFormData({ ...formData, playersCount: e.target.value })}
                    className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground">Цена за человека (₽) *</label>
                <div className="relative">
                  <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    min="0"
                    value={formData.packagePrice}
                    onChange={(e) => setFormData({ ...formData, packagePrice: e.target.value })}
                    className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Персонал</h3>

            {/* Animators */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground flex items-center gap-1">
                  <Users size={10} className="text-purple-500" /> Кол-во аниматоров
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.animatorsCount}
                  onChange={(e) => setFormData({ ...formData, animatorsCount: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground">Ставка аниматора (₽)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.animatorRate}
                  onChange={(e) => setFormData({ ...formData, animatorRate: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Hosts */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground flex items-center gap-1">
                  <Mic size={10} className="text-blue-500" /> Кол-во ведущих
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.hostsCount}
                  onChange={(e) => setFormData({ ...formData, hostsCount: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground">Ставка ведущего (₽)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.hostRate}
                  onChange={(e) => setFormData({ ...formData, hostRate: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* DJs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground flex items-center gap-1">
                  <Music size={10} className="text-pink-500" /> Кол-во DJ
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.djsCount}
                  onChange={(e) => setFormData({ ...formData, djsCount: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground">Ставка DJ (₽)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.djRate}
                  onChange={(e) => setFormData({ ...formData, djRate: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Finance Section */}
          <div className="space-y-2 pt-2 border-t border-border">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Финансы</h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground">Предоплата (₽)</label>
                <div className="relative">
                  <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    min="0"
                    value={formData.prepayment}
                    onChange={(e) => setFormData({ ...formData, prepayment: e.target.value })}
                    className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground">Общая сумма</label>
                <div className="bg-muted rounded px-2 py-1.5 text-xs font-semibold text-green-600">
                  {totalAmount.toLocaleString()} ₽
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-2 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span>Расходы на персонал:</span>
                <span className="text-red-500">-{staffCost.toLocaleString()} ₽</span>
              </div>
              <div className="flex justify-between text-xs font-semibold border-t pt-1">
                <span>Прибыль:</span>
                <span className={profit >= 0 ? "text-green-600" : "text-red-500"}>{profit.toLocaleString()} ₽</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Ответственный</label>
              <select
                value={formData.responsibleId}
                onChange={(e) => setFormData({ ...formData, responsibleId: e.target.value })}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary"
              >
                <option value="">Не назначен</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === "admin" ? "Админ" : "Франчайзи"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium text-foreground">Примечания</label>
              <div className="relative">
                <FileText size={12} className="absolute left-2 top-2 text-muted-foreground" />
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Дополнительная информация..."
                  className="w-full bg-background border border-border rounded pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary min-h-[60px] resize-none"
                />
              </div>
            </div>
          </div>

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
              {isSubmitting ? "Создание..." : "Создать заявку"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
