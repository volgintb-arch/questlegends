"use client"

import { useState, useEffect } from "react"
import { Target, Users, TrendingUp, Settings, CheckCircle2 } from "lucide-react"
import { KPIManagementModal } from "./kpi-management-modal"

interface Franchisee {
  id: string
  name: string
  city: string
}

interface BulkKPI {
  periodType: "month" | "quarter" | "year"
  periodYear: number
  periodNumber: number
  targetRevenue?: number
  targetGames?: number
  maxExpenses?: number
}

export function UKKPIManagement() {
  const [franchisees, setFranchisees] = useState<Franchisee[]>([])
  const [selectedFranchisee, setSelectedFranchisee] = useState<Franchisee | null>(null)
  const [showKPIModal, setShowKPIModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadFranchisees()
  }, [])

  const loadFranchisees = async () => {
    try {
      const response = await fetch("/api/franchisees")
      if (response.ok) {
        const data = await response.json()
        setFranchisees(data)
      }
    } catch (error) {
      console.error("[v0] Failed to load franchisees:", error)
    }
  }

  const handleAssignSingle = (franchisee: Franchisee) => {
    setSelectedFranchisee(franchisee)
    setShowKPIModal(true)
  }

  const handleAssignAll = () => {
    setShowBulkModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Управление KPI Франчайзи</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Установите планы по выручке, количеству игр и лимиты расходов
            </p>
          </div>
          <button
            onClick={handleAssignAll}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            <Users size={18} />
            Назначить KPI всем
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {franchisees.map((franchisee) => (
            <div
              key={franchisee.id}
              className="bg-muted/50 border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{franchisee.name}</h3>
                  <p className="text-xs text-muted-foreground">{franchisee.city}</p>
                </div>
                <Target size={20} className="text-primary" />
              </div>

              <button
                onClick={() => handleAssignSingle(franchisee)}
                className="w-full mt-3 px-4 py-2 bg-background hover:bg-muted text-foreground border border-border rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Settings size={16} />
                Управление KPI
              </button>
            </div>
          ))}
        </div>

        {franchisees.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Франчайзи не найдены</p>
          </div>
        )}
      </div>

      {/* Single franchisee KPI modal */}
      {selectedFranchisee && (
        <KPIManagementModal
          isOpen={showKPIModal}
          onClose={() => {
            setShowKPIModal(false)
            setSelectedFranchisee(null)
          }}
          franchiseeId={selectedFranchisee.id}
          franchiseeName={`${selectedFranchisee.name} - ${selectedFranchisee.city}`}
        />
      )}

      {/* Bulk KPI assignment modal */}
      {showBulkModal && (
        <BulkKPIModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          franchisees={franchisees}
          onSuccess={() => {
            setShowBulkModal(false)
            loadFranchisees()
          }}
        />
      )}
    </div>
  )
}

function BulkKPIModal({
  isOpen,
  onClose,
  franchisees,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  franchisees: Franchisee[]
  onSuccess: () => void
}) {
  const [bulkKPI, setBulkKPI] = useState<BulkKPI>({
    periodType: "month",
    periodYear: new Date().getFullYear(),
    periodNumber: new Date().getMonth() + 1,
  })
  const [selectedFranchisees, setSelectedFranchisees] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Select all franchisees by default
    setSelectedFranchisees(franchisees.map((f) => f.id))
  }, [franchisees])

  const toggleFranchisee = (id: string) => {
    setSelectedFranchisees((prev) => (prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    if (selectedFranchisees.length === franchisees.length) {
      setSelectedFranchisees([])
    } else {
      setSelectedFranchisees(franchisees.map((f) => f.id))
    }
  }

  const handleSave = async () => {
    if (selectedFranchisees.length === 0) return
    if (!bulkKPI.targetRevenue && !bulkKPI.targetGames) {
      alert("Укажите хотя бы один план: выручка или количество игр")
      return
    }

    setLoading(true)
    try {
      await fetch("/api/kpi/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          franchiseeIds: selectedFranchisees,
          ...bulkKPI,
        }),
      })

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (error) {
      console.error("[v0] Failed to assign bulk KPI:", error)
      alert("Ошибка при назначении KPI")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md text-center">
          <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">KPI успешно назначены!</h3>
          <p className="text-sm text-muted-foreground">Планы установлены для {selectedFranchisees.length} франчайзи</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Массовое назначение KPI</h2>
          <p className="text-sm text-muted-foreground mt-1">Установите одинаковые планы для нескольких франчайзи</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Franchisee selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Выбрать франчайзи ({selectedFranchisees.length}/{franchisees.length})
              </label>
              <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                {selectedFranchisees.length === franchisees.length ? "Снять все" : "Выбрать все"}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
              {franchisees.map((franchisee) => (
                <label
                  key={franchisee.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFranchisees.includes(franchisee.id)}
                    onChange={() => toggleFranchisee(franchisee.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{franchisee.name}</p>
                    <p className="text-xs text-muted-foreground">{franchisee.city}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Period configuration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Тип периода</label>
              <select
                value={bulkKPI.periodType}
                onChange={(e) => setBulkKPI({ ...bulkKPI, periodType: e.target.value as any })}
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
                value={bulkKPI.periodYear}
                onChange={(e) => setBulkKPI({ ...bulkKPI, periodYear: Number.parseInt(e.target.value) })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {bulkKPI.periodType === "month" ? "Месяц" : bulkKPI.periodType === "quarter" ? "Квартал" : "Период"}
              </label>
              <input
                type="number"
                value={bulkKPI.periodNumber}
                onChange={(e) => setBulkKPI({ ...bulkKPI, periodNumber: Number.parseInt(e.target.value) })}
                min="1"
                max={bulkKPI.periodType === "month" ? 12 : bulkKPI.periodType === "quarter" ? 4 : 1}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* KPI values */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">План по выручке (₽)</label>
              <input
                type="number"
                value={bulkKPI.targetRevenue || ""}
                onChange={(e) =>
                  setBulkKPI({ ...bulkKPI, targetRevenue: Number.parseInt(e.target.value) || undefined })
                }
                placeholder="500000"
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">План по количеству игр</label>
              <input
                type="number"
                value={bulkKPI.targetGames || ""}
                onChange={(e) => setBulkKPI({ ...bulkKPI, targetGames: Number.parseInt(e.target.value) || undefined })}
                placeholder="20"
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Максимальные расходы (₽)</label>
              <input
                type="number"
                value={bulkKPI.maxExpenses || ""}
                onChange={(e) => setBulkKPI({ ...bulkKPI, maxExpenses: Number.parseInt(e.target.value) || undefined })}
                placeholder="100000"
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">Оставьте пустым если не нужно ограничение</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={loading || selectedFranchisees.length === 0}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>Назначение...</>
            ) : (
              <>
                <TrendingUp size={18} />
                Назначить KPI ({selectedFranchisees.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
