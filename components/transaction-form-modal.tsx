"use client"

import type React from "react"

import { useState } from "react"
import { X, Calculator } from "lucide-react"

interface TransactionFormData {
  amo_deal_id: string
  participants_N: number
  package_price_B: number
  location_id: string
}

interface CalculatedTransaction extends TransactionFormData {
  required_animators: number
  total_revenue: number
  royalty_amount: number
  fot_calculation: number
}

interface TransactionFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (transaction: CalculatedTransaction) => void
  locations: { id: string; name: string }[]
}

export function TransactionFormModal({ isOpen, onClose, onSubmit, locations }: TransactionFormModalProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    amo_deal_id: "",
    participants_N: 0,
    package_price_B: 0,
    location_id: "",
  })

  const [showCalculation, setShowCalculation] = useState(false)

  const calculateTransaction = (): CalculatedTransaction | null => {
    if (!formData.amo_deal_id || !formData.participants_N || !formData.location_id) {
      return null
    }

    // С1/С2: Расчет количества аниматоров (required_animators = ⌈participants_N / 7⌉)
    const required_animators = Math.ceil(formData.participants_N / 7)

    // С1/С2: Применение минимального чека 21,000 руб
    const total_revenue = formData.package_price_B < 21000 ? 21000 : formData.package_price_B

    // С1/С2: Расчет роялти 7%
    const royalty_amount = total_revenue * 0.07

    // С1/С2: Расчет ФОТ
    const fot_calculation = required_animators * 1300 + 1800 + 1000

    return {
      ...formData,
      required_animators,
      total_revenue,
      royalty_amount,
      fot_calculation,
    }
  }

  const calculatedData = calculateTransaction()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (calculatedData) {
      onSubmit(calculatedData)
      onClose()
      // Reset form
      setFormData({
        amo_deal_id: "",
        participants_N: 0,
        package_price_B: 0,
        location_id: "",
      })
      setShowCalculation(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Новая Транзакция</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Input Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                ID Сделки (AmoCRM) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.amo_deal_id}
                onChange={(e) => setFormData({ ...formData, amo_deal_id: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                placeholder="DEAL-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Количество Участников <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.participants_N || ""}
                onChange={(e) => setFormData({ ...formData, participants_N: Number.parseInt(e.target.value) || 0 })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                placeholder="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Цена Пакета (₽)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.package_price_B || ""}
                onChange={(e) => setFormData({ ...formData, package_price_B: Number.parseFloat(e.target.value) || 0 })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                placeholder="25000"
              />
              <p className="text-xs text-muted-foreground mt-1">Минимальный чек: 21,000 ₽</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Локация <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">Выберите локацию</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calculate Button */}
          {!showCalculation && calculatedData && (
            <button
              type="button"
              onClick={() => setShowCalculation(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
            >
              <Calculator size={18} />
              <span className="font-medium">Рассчитать Транзакцию</span>
            </button>
          )}

          {/* Calculated Results */}
          {showCalculation && calculatedData && (
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calculator size={16} />
                Результаты Расчета
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card p-3 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Требуется Аниматоров</p>
                  <p className="text-lg font-bold text-blue-500">{calculatedData.required_animators}</p>
                  <p className="text-xs text-muted-foreground">⌈{formData.participants_N} / 7⌉</p>
                </div>

                <div className="bg-card p-3 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Выручка (с мин.чеком)</p>
                  <p className="text-lg font-bold text-green-500">{calculatedData.total_revenue.toLocaleString()} ₽</p>
                  {formData.package_price_B < 21000 && <p className="text-xs text-orange-500">Применен мин. чек</p>}
                </div>

                <div className="bg-card p-3 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Роялти (7%)</p>
                  <p className="text-lg font-bold text-orange-500">
                    {calculatedData.royalty_amount.toLocaleString()} ₽
                  </p>
                </div>

                <div className="bg-card p-3 rounded">
                  <p className="text-xs text-muted-foreground mb-1">ФОТ</p>
                  <p className="text-lg font-bold text-purple-500">
                    {calculatedData.fot_calculation.toLocaleString()} ₽
                  </p>
                  <p className="text-xs text-muted-foreground">({calculatedData.required_animators} × 1300) + 2800</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Чистая Прибыль:</span>
                  <span className="text-xl font-bold text-green-600">
                    {(
                      calculatedData.total_revenue -
                      calculatedData.royalty_amount -
                      calculatedData.fot_calculation
                    ).toLocaleString()}{" "}
                    ₽
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!calculatedData}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Создать Транзакцию
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
