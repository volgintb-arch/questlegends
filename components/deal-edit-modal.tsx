"use client"

import { useState } from "react"
import { X, Save } from "lucide-react"

interface Deal {
  id: string
  title: string
  location: string
  amount: string
  daysOpen: number
  priority?: "high" | "normal"
  participants?: number
  package?: string
}

interface DealEditModalProps {
  deal: Deal | null
  isOpen: boolean
  onClose: () => void
  onSave: (deal: Deal) => void
  role?: "uk" | "franchisee" | "admin" // Added role prop
}

export function DealEditModal({ deal, isOpen, onClose, onSave, role = "uk" }: DealEditModalProps) {
  const [formData, setFormData] = useState<Deal>(
    deal || {
      id: "",
      title: "",
      location: "",
      amount: "",
      daysOpen: 0,
      priority: "normal",
    },
  )

  if (!isOpen) return null

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">{deal ? "Редактировать сделку" : "Новая сделка"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Название</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Введите название"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Локация</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              disabled={role !== "uk"} // Franchisee/admin cannot change location
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Введите локацию"
            />
            {role !== "uk" && <p className="text-xs text-muted-foreground mt-1">Локация не может быть изменена</p>}
          </div>

          {role !== "uk" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Количество участников (N)</label>
              <input
                type="number"
                value={formData.participants || ""}
                onChange={(e) => setFormData({ ...formData, participants: Number.parseInt(e.target.value) || 0 })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Введите количество"
              />
            </div>
          )}

          {role !== "uk" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Выбранный пакет</label>
              <select
                value={formData.package || ""}
                onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">Выберите пакет</option>
                <option value="Стандарт">Стандарт</option>
                <option value="Премиум">Премиум</option>
                <option value="VIP">VIP</option>
                <option value="Образовательный">Образовательный</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Сумма</label>
            <input
              type="text"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Например: 500,000 ₽"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Приоритет</label>
            <select
              value={formData.priority || "normal"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as "high" | "normal",
                })
              }
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="normal">Обычный</option>
              <option value="high">Высокий</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            <Save size={16} />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
