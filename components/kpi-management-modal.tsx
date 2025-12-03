"use client"

import { useState } from "react"
import { X, Plus, Trash2, Target } from "lucide-react"

interface KPI {
  id?: string
  periodType: "month" | "quarter" | "year"
  periodYear: number
  periodNumber: number
  targetRevenue?: number
  targetGames?: number
  maxExpenses?: number
}

interface KPIManagementModalProps {
  isOpen: boolean
  onClose: () => void
  franchiseeId: string
  franchiseeName: string
  existingKPIs?: KPI[]
}

const PERIOD_PRESETS = [
  { label: "Этот месяц", type: "month", number: 1 },
  { label: "Этот квартал", type: "quarter", number: 1 },
  { label: "Этот год", type: "year", number: 1 },
]

export function KPIManagementModal({
  isOpen,
  onClose,
  franchiseeId,
  franchiseeName,
  existingKPIs = [],
}: KPIManagementModalProps) {
  const [kpis, setKpis] = useState<KPI[]>(existingKPIs)
  const [newKPI, setNewKPI] = useState<KPI>({
    periodType: "month",
    periodYear: new Date().getFullYear(),
    periodNumber: new Date().getMonth() + 1,
    targetRevenue: undefined,
    targetGames: undefined,
    maxExpenses: undefined,
  })

  if (!isOpen) return null

  const handleAddKPI = () => {
    if ((newKPI.targetRevenue && newKPI.targetRevenue > 0) || (newKPI.targetGames && newKPI.targetGames > 0)) {
      setKpis([...kpis, { ...newKPI }])
      setNewKPI({
        periodType: "month",
        periodYear: new Date().getFullYear(),
        periodNumber: new Date().getMonth() + 1,
        targetRevenue: undefined,
        targetGames: undefined,
        maxExpenses: undefined,
      })
    }
  }

  const handleRemoveKPI = (index: number) => {
    setKpis(kpis.filter((_, i) => i !== index))
  }

  const handleSetPeriod = (preset: { type: string; number: number }) => {
    setNewKPI({
      ...newKPI,
      periodType: preset.type as any,
      periodNumber: preset.number,
    })
  }

  const handleSave = async () => {
    try {
      // Save all KPIs via API
      for (const kpi of kpis) {
        if (!kpi.id) {
          await fetch("/api/kpi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              franchiseeId,
              ...kpi,
            }),
          })
        }
      }

      console.log("[v0] KPIs saved for franchisee:", franchiseeId)
      onClose()
    } catch (error) {
      console.error("[v0] Failed to save KPIs:", error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Управление KPI</h2>
            <p className="text-sm text-muted-foreground mt-1">{franchiseeName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Existing KPIs */}
          {kpis.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Установленные KPI</h3>
              {kpis.map((kpi, index) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={16} className="text-primary" />
                      <span className="font-medium text-foreground">
                        {kpi.periodType === "month"
                          ? `Месяц ${kpi.periodNumber}`
                          : kpi.periodType === "quarter"
                            ? `Квартал ${kpi.periodNumber}`
                            : "Год"}{" "}
                        {kpi.periodYear}
                      </span>
                    </div>
                    {kpi.targetRevenue && (
                      <p className="text-sm text-muted-foreground">
                        План по выручке:{" "}
                        <span className="font-semibold text-foreground">{kpi.targetRevenue.toLocaleString()} ₽</span>
                      </p>
                    )}
                    {kpi.targetGames && (
                      <p className="text-sm text-muted-foreground">
                        План по играм: <span className="font-semibold text-foreground">{kpi.targetGames} игр</span>
                      </p>
                    )}
                    {kpi.maxExpenses && (
                      <p className="text-sm text-destructive">
                        Лимит расходов: <span className="font-semibold">{kpi.maxExpenses.toLocaleString()} ₽</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveKPI(index)}
                    className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add New KPI */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Добавить новый KPI</h3>

            {/* Period Type and Selection */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Тип периода</label>
                <select
                  value={newKPI.periodType}
                  onChange={(e) =>
                    setNewKPI({
                      ...newKPI,
                      periodType: e.target.value as any,
                      periodNumber: e.target.value === "month" ? 1 : e.target.value === "quarter" ? 1 : 1,
                    })
                  }
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="month">Месяц</option>
                  <option value="quarter">Квартал</option>
                  <option value="year">Год</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Год</label>
                <input
                  type="number"
                  value={newKPI.periodYear}
                  onChange={(e) => setNewKPI({ ...newKPI, periodYear: Number.parseInt(e.target.value) })}
                  min="2020"
                  max="2030"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {newKPI.periodType === "month" ? "Месяц" : newKPI.periodType === "quarter" ? "Квартал" : "Период"}
                </label>
                <input
                  type="number"
                  value={newKPI.periodNumber}
                  onChange={(e) => setNewKPI({ ...newKPI, periodNumber: Number.parseInt(e.target.value) })}
                  min="1"
                  max={newKPI.periodType === "month" ? "12" : newKPI.periodType === "quarter" ? "4" : "1"}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Period Presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Быстрый выбор периода</label>
              <div className="grid grid-cols-4 gap-2">
                {PERIOD_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleSetPeriod(preset)}
                    className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs rounded-lg transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Revenue */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">План по выручке (₽)</label>
              <input
                type="number"
                value={newKPI.targetRevenue || ""}
                onChange={(e) => setNewKPI({ ...newKPI, targetRevenue: Number.parseInt(e.target.value) || undefined })}
                placeholder="500000"
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Target Games */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">План по количеству игр</label>
              <input
                type="number"
                value={newKPI.targetGames || ""}
                onChange={(e) => setNewKPI({ ...newKPI, targetGames: Number.parseInt(e.target.value) || undefined })}
                placeholder="20"
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Max Expenses */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Максимальные расходы (₽, опционально)</label>
              <input
                type="number"
                value={newKPI.maxExpenses || ""}
                onChange={(e) => setNewKPI({ ...newKPI, maxExpenses: Number.parseInt(e.target.value) || undefined })}
                placeholder="100000"
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">Оставьте пустым если не нужно ограничение</p>
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddKPI}
              disabled={!newKPI.targetRevenue && !newKPI.targetGames}
              className="w-full px-4 py-2 bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Добавить KPI
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            Сохранить все KPI
          </button>
        </div>
      </div>
    </div>
  )
}
