"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  Building2, Target, Settings, UserPlus, ClipboardList,
  Plus, Pencil, Trash2, X, Check,
} from "lucide-react"

// ============================================================
// Types
// ============================================================

interface Franchisee {
  id: string
  name: string
  city: string
  royaltyPercent: number
  royaltyPaymentDay: number | null
  completedGames: number
  cancelledGames: number
  gamesRevenue: number
  totalExpenses: number
}

interface KPI {
  id: string
  franchiseeId: string
  franchiseeName: string
  periodType: string
  periodNumber: number
  periodYear: number
  targetRevenue: number | null
  targetGames: number | null
  maxExpenses: number | null
  actualRevenue: number
  actualGames: number
  actualExpenses: number
}

interface Assignment {
  id: string
  userId: string
  franchiseeId: string
  userName: string
  userPhone: string
  userRole?: string
  franchiseeName: string
  franchiseeCity: string
}

interface UKEmployee {
  id: string
  name: string
  phone: string
  role: string
}

// ============================================================
// Tab definitions
// ============================================================

const TABS = [
  { id: "overview", label: "Обзор", icon: Building2 },
  { id: "kpi", label: "KPI", icon: Target },
  { id: "settings", label: "Настройки", icon: Settings },
  { id: "assignments", label: "Ответственные", icon: UserPlus },
  { id: "summary", label: "Сводка", icon: ClipboardList },
] as const

type TabId = (typeof TABS)[number]["id"]

// ============================================================
// Main component
// ============================================================

export function FranchiseManagement() {
  const { user, getAuthHeaders } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [franchises, setFranchises] = useState<Franchisee[]>([])
  const [loading, setLoading] = useState(true)

  const isUK = user?.role === "uk" || user?.role === "super_admin"
  const isUKEmployee = user?.role === "uk_employee"

  useEffect(() => {
    loadFranchises()
  }, [])

  const loadFranchises = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch("/api/franchisees", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setFranchises(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error("Error loading franchises:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Управление франчизи</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isUKEmployee ? "Ваши назначенные франчизи" : "Управление всеми франчизи сети"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => {
          // UK employees don't see assignments tab (managed by UK)
          if (tab.id === "assignments" && isUKEmployee) return null
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab franchises={franchises} />}
      {activeTab === "kpi" && <KPITab franchises={franchises} isUK={isUK} />}
      {activeTab === "settings" && <SettingsTab franchises={franchises} isUK={isUK || isUKEmployee} onUpdate={() => loadFranchises(true)} />}
      {activeTab === "assignments" && isUK && <AssignmentsTab franchises={franchises} />}
      {activeTab === "summary" && <SummaryTab franchises={franchises} />}
    </div>
  )
}

// ============================================================
// Tab: Overview
// ============================================================

function OverviewTab({ franchises }: { franchises: Franchisee[] }) {
  const { getAuthHeaders } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [allExpenses, setAllExpenses] = useState<any[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    const fetchFinancials = async () => {
      try {
        const headers = getAuthHeaders()
        const [txRes, expRes] = await Promise.all([
          fetch("/api/transactions?limit=1000", { headers, cache: "no-store" }),
          fetch("/api/expenses", { headers, cache: "no-store" }),
        ])
        if (txRes.ok) {
          const data = await txRes.json()
          setTransactions(Array.isArray(data) ? data : data.data || data.transactions || [])
        }
        if (expRes.ok) {
          const data = await expRes.json()
          setAllExpenses(Array.isArray(data) ? data : data.data || [])
        }
      } catch (e) {
        console.error("OverviewTab: failed to fetch financials", e)
      } finally {
        setDataLoaded(true)
      }
    }
    fetchFinancials()
  }, [getAuthHeaders])

  const enriched = useMemo(() => {
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`

    const inMonth = (dateStr: string) => {
      const d = (dateStr || "").split("T")[0]
      return d >= monthStart && d <= monthEndStr
    }

    return franchises.map((f) => {
      const fTx = transactions.filter((t: any) => t.franchiseeId === f.id && inMonth(t.date || t.paymentDate || t.createdAt))

      const revenue = fTx
        .filter((t: any) => t.type === "income")
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

      const txExpenses = fTx
        .filter((t: any) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

      const tableExpenses = allExpenses
        .filter((e: any) => e.franchiseeId === f.id && inMonth(e.date || e.createdAt))
        .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)

      const expenses = txExpenses + tableExpenses
      const royaltyPercent = Number(f.royaltyPercent) || 0
      const royalty = Math.round((revenue * royaltyPercent) / 100)
      const profit = revenue - expenses - royalty

      return { ...f, revenue, expenses, royalty, profit }
    })
  }, [franchises, transactions, allExpenses])

  const formatMoney = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ₽`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K ₽`
    return `${Math.round(v)} ₽`
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{franchises.length} франшиз · текущий месяц</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {enriched.map((f) => {
          const completed = Number(f.completedGames) || 0
          const cancelled = Number(f.cancelledGames) || 0
          const cancelRate = completed > 0 ? Math.round((cancelled / completed) * 100) : 0

          return (
            <div key={f.id} className="bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{f.name}</h3>
                  <p className="text-xs text-muted-foreground">{f.city}</p>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  Роялти {f.royaltyPercent}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Выручка</p>
                  <p className="text-sm font-medium">{formatMoney(f.revenue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Расходы</p>
                  <p className="text-sm font-medium text-muted-foreground">{formatMoney(f.expenses)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Роялти</p>
                  <p className="text-sm font-medium text-muted-foreground">{formatMoney(f.royalty)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Прибыль</p>
                  <p className={`text-sm font-semibold ${f.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatMoney(f.profit)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Игры: {completed}</span>
                <span>
                  Отказы: {cancelled}{" "}
                  <span className={cancelRate > 30 ? "text-red-600" : cancelRate > 15 ? "text-orange-500" : "text-green-600"}>
                    ({cancelRate}%)
                  </span>
                </span>
              </div>

              {f.royaltyPaymentDay && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Оплата роялти: {f.royaltyPaymentDay}-е число каждого месяца
                </p>
              )}
            </div>
          )
        })}
      </div>

      {franchises.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Нет франчайзи</div>
      )}
    </div>
  )
}

// ============================================================
// Tab: KPI
// ============================================================

function KPITab({ franchises, isUK }: { franchises: Franchisee[]; isUK: boolean }) {
  const { getAuthHeaders } = useAuth()
  const [kpis, setKpis] = useState<KPI[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null)
  const [form, setForm] = useState({
    franchiseeId: "",
    periodType: "month",
    periodNumber: new Date().getMonth() + 1,
    periodYear: new Date().getFullYear(),
    targetRevenue: "",
    targetGames: "",
    maxExpenses: "",
  })

  useEffect(() => {
    loadKpis()
  }, [])

  const loadKpis = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/franchisee-kpi", { headers: getAuthHeaders() })
      if (res.ok) {
        setKpis(await res.json())
      }
    } catch (error) {
      console.error("Error loading KPIs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (editingKpi) {
        const res = await fetch(`/api/franchisee-kpi/${editingKpi.id}`, {
          method: "PATCH",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            targetRevenue: form.targetRevenue ? Number(form.targetRevenue) : null,
            targetGames: form.targetGames ? Number(form.targetGames) : null,
            maxExpenses: form.maxExpenses ? Number(form.maxExpenses) : null,
          }),
        })
        if (!res.ok) throw new Error("Failed to update KPI")
      } else {
        const res = await fetch("/api/franchisee-kpi", {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            franchiseeId: form.franchiseeId,
            periodType: form.periodType,
            periodNumber: Number(form.periodNumber),
            periodYear: Number(form.periodYear),
            targetRevenue: form.targetRevenue ? Number(form.targetRevenue) : null,
            targetGames: form.targetGames ? Number(form.targetGames) : null,
            maxExpenses: form.maxExpenses ? Number(form.maxExpenses) : null,
          }),
        })
        if (!res.ok) throw new Error("Failed to create KPI")
      }
      setShowForm(false)
      setEditingKpi(null)
      loadKpis()
    } catch (error) {
      console.error("Error saving KPI:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот KPI?")) return
    try {
      await fetch(`/api/franchisee-kpi/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      loadKpis()
    } catch (error) {
      console.error("Error deleting KPI:", error)
    }
  }

  const openCreate = () => {
    setEditingKpi(null)
    setForm({
      franchiseeId: franchises[0]?.id || "",
      periodType: "month",
      periodNumber: new Date().getMonth() + 1,
      periodYear: new Date().getFullYear(),
      targetRevenue: "",
      targetGames: "",
      maxExpenses: "",
    })
    setShowForm(true)
  }

  const openEdit = (kpi: KPI) => {
    setEditingKpi(kpi)
    setForm({
      franchiseeId: kpi.franchiseeId,
      periodType: kpi.periodType,
      periodNumber: kpi.periodNumber,
      periodYear: kpi.periodYear,
      targetRevenue: kpi.targetRevenue?.toString() || "",
      targetGames: kpi.targetGames?.toString() || "",
      maxExpenses: kpi.maxExpenses?.toString() || "",
    })
    setShowForm(true)
  }

  const periodLabel = (kpi: KPI) => {
    if (kpi.periodType === "month") {
      const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
      return `${months[kpi.periodNumber - 1]} ${kpi.periodYear}`
    }
    return `Q${kpi.periodNumber} ${kpi.periodYear}`
  }

  const progressBar = (actual: number, target: number | null, inverse = false) => {
    if (!target) return <span className="text-xs text-muted-foreground">—</span>
    const pct = Math.min(Math.round((actual / target) * 100), 200)
    const color = inverse
      ? (pct > 100 ? "bg-red-500" : "bg-green-500")
      : (pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500")
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>{actual.toLocaleString()}</span>
          <span className="text-muted-foreground">/ {target.toLocaleString()}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    )
  }

  if (loading) return <p className="text-muted-foreground py-8 text-center">Загрузка KPI...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{kpis.length} KPI записей</p>
        {isUK && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90"
          >
            <Plus size={16} /> Создать KPI
          </button>
        )}
      </div>

      {/* KPI Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editingKpi ? "Редактировать KPI" : "Создать KPI"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            {!editingKpi && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">Франчайзи</label>
                  <select
                    value={form.franchiseeId}
                    onChange={(e) => setForm({ ...form, franchiseeId: e.target.value })}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  >
                    {franchises.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} — {f.city}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Период</label>
                    <select
                      value={form.periodType}
                      onChange={(e) => setForm({ ...form, periodType: e.target.value })}
                      className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="month">Месяц</option>
                      <option value="quarter">Квартал</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Номер</label>
                    <input
                      type="number"
                      value={form.periodNumber}
                      onChange={(e) => setForm({ ...form, periodNumber: Number(e.target.value) })}
                      min={1}
                      max={form.periodType === "month" ? 12 : 4}
                      className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Год</label>
                    <input
                      type="number"
                      value={form.periodYear}
                      onChange={(e) => setForm({ ...form, periodYear: Number(e.target.value) })}
                      className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs text-muted-foreground">Целевая выручка (₽)</label>
              <input
                type="number"
                value={form.targetRevenue}
                onChange={(e) => setForm({ ...form, targetRevenue: e.target.value })}
                placeholder="Не задано"
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Целевое кол-во игр</label>
              <input
                type="number"
                value={form.targetGames}
                onChange={(e) => setForm({ ...form, targetGames: e.target.value })}
                placeholder="Не задано"
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Макс. расходы (₽)</label>
              <input
                type="number"
                value={form.maxExpenses}
                onChange={(e) => setForm({ ...form, maxExpenses: e.target.value })}
                placeholder="Не задано"
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90"
              >
                {editingKpi ? "Сохранить" : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI List */}
      <div className="space-y-3">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-sm">{kpi.franchiseeName}</h4>
                <p className="text-xs text-muted-foreground">{periodLabel(kpi)}</p>
              </div>
              {isUK && (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(kpi)} className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(kpi.id)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-muted">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Выручка</p>
                {progressBar(kpi.actualRevenue, kpi.targetRevenue)}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Игры</p>
                {progressBar(kpi.actualGames, kpi.targetGames)}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Расходы</p>
                {progressBar(kpi.actualExpenses, kpi.maxExpenses, true)}
              </div>
            </div>
          </div>
        ))}

        {kpis.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Нет KPI. {isUK && "Нажмите «Создать KPI» для добавления."}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Tab: Settings (royalty %, payment day)
// ============================================================

function SettingsTab({ franchises, isUK, onUpdate }: { franchises: Franchisee[]; isUK: boolean; onUpdate: () => Promise<void> | void }) {
  const { getAuthHeaders } = useAuth()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ royaltyPercent: "0", royaltyPaymentDay: "" })
  const [saving, setSaving] = useState(false)
  const [localFranchises, setLocalFranchises] = useState<Franchisee[]>(franchises)

  // Keep local copy in sync when parent prop changes (after refetch)
  useEffect(() => {
    setLocalFranchises(franchises)
  }, [franchises])

  const startEdit = (f: Franchisee) => {
    setEditingId(f.id)
    setEditValues({
      royaltyPercent: String(f.royaltyPercent ?? 0),
      royaltyPaymentDay: f.royaltyPaymentDay?.toString() || "",
    })
  }

  const save = async (franchiseeId: string) => {
    try {
      setSaving(true)
      const newRoyaltyPercent = Number(editValues.royaltyPercent)
      const newRoyaltyPaymentDay = editValues.royaltyPaymentDay ? Number(editValues.royaltyPaymentDay) : null
      const res = await fetch(`/api/franchisees/${franchiseeId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          royaltyPercent: newRoyaltyPercent,
          royaltyPaymentDay: newRoyaltyPaymentDay,
        }),
      })
      if (res.ok) {
        // Optimistically update local state so values appear immediately
        setLocalFranchises((prev) =>
          prev.map((f) =>
            f.id === franchiseeId
              ? { ...f, royaltyPercent: newRoyaltyPercent, royaltyPaymentDay: newRoyaltyPaymentDay }
              : f
          )
        )
        setEditingId(null)
        // Also trigger background refetch to keep parent state in sync
        await onUpdate()
      } else {
        const err = await res.text()
        console.error("[v0] Failed to save royalty:", err)
        alert("Не удалось сохранить настройки роялти")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      alert("Ошибка сети при сохранении")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Роялти и дата уплаты для каждого франчайзи</p>

      <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Франчайзи</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Город</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Роялти %</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">День оплаты</th>
              {isUK && <th className="px-4 py-3 w-20"></th>}
            </tr>
          </thead>
          <tbody>
            {localFranchises.map((f) => (
              <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{f.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.city}</td>
                <td className="px-4 py-3 text-right">
                  {editingId === f.id ? (
                    <input
                      type="number"
                      value={editValues.royaltyPercent}
                      onChange={(e) => setEditValues({ ...editValues, royaltyPercent: e.target.value })}
                      min={0} max={100} step={0.5}
                      className="w-20 text-right bg-background border border-border rounded px-2 py-1 text-sm"
                    />
                  ) : (
                    <span className="font-medium text-primary">{f.royaltyPercent}%</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === f.id ? (
                    <input
                      type="number"
                      value={editValues.royaltyPaymentDay}
                      onChange={(e) => setEditValues({ ...editValues, royaltyPaymentDay: e.target.value })}
                      min={1} max={31}
                      placeholder="—"
                      className="w-20 text-right bg-background border border-border rounded px-2 py-1 text-sm"
                    />
                  ) : (
                    <span className="text-muted-foreground">
                      {f.royaltyPaymentDay ? `${f.royaltyPaymentDay}-е` : "—"}
                    </span>
                  )}
                </td>
                {isUK && (
                  <td className="px-4 py-3">
                    {editingId === f.id ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => save(f.id)} disabled={saving} className="p-1 text-green-500 hover:bg-green-500/10 rounded">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(f)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted">
                        <Pencil size={14} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// Tab: Assignments (UK employees → Franchisees)
// ============================================================

function AssignmentsTab({ franchises }: { franchises: Franchisee[] }) {
  const { getAuthHeaders } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [ukEmployees, setUkEmployees] = useState<UKEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ userId: "", franchiseeId: "" })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const headers = getAuthHeaders()
      const [assignRes, usersRes] = await Promise.all([
        fetch("/api/franchise-assignments", { headers }),
        fetch("/api/users?roles=uk,uk_employee", { headers }),
      ])
      if (assignRes.ok) setAssignments(await assignRes.json())
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUkEmployees(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error("Error loading assignments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!addForm.userId || !addForm.franchiseeId) return
    try {
      const res = await fetch("/api/franchise-assignments", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        setShowAdd(false)
        setAddForm({ userId: "", franchiseeId: "" })
        loadData()
      } else {
        const err = await res.json()
        alert(err.error || "Ошибка")
      }
    } catch (error) {
      console.error("Error adding assignment:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить назначение?")) return
    try {
      await fetch(`/api/franchise-assignments?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      loadData()
    } catch (error) {
      console.error("Error deleting assignment:", error)
    }
  }

  if (loading) return <p className="text-muted-foreground py-8 text-center">Загрузка...</p>

  // Group by franchisee
  const grouped = franchises.map((f) => ({
    ...f,
    employees: assignments.filter((a) => a.franchiseeId === f.id),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{assignments.length} назначений</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90"
        >
          <Plus size={16} /> Назначить
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium">Новое назначение</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Сотрудник УК</label>
              <select
                value={addForm.userId}
                onChange={(e) => setAddForm({ ...addForm, userId: e.target.value })}
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Выберите...</option>
                {ukEmployees.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Франчайзи</label>
              <select
                value={addForm.franchiseeId}
                onChange={(e) => setAddForm({ ...addForm, franchiseeId: e.target.value })}
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Выберите...</option>
                {franchises.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} — {f.city}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-muted-foreground">Отмена</button>
            <button onClick={handleAdd} className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg">Назначить</button>
          </div>
        </div>
      )}

      {/* Assignments grouped by franchisee */}
      <div className="space-y-3">
        {grouped.map((f) => (
          <div key={f.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-sm">{f.name}</h4>
                <p className="text-xs text-muted-foreground">{f.city}</p>
              </div>
              <span className="text-xs text-muted-foreground">{f.employees.length} сотрудников</span>
            </div>
            {f.employees.length > 0 ? (
              <div className="space-y-1">
                {f.employees.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
                    <div>
                      <span className="text-sm">{a.userName}</span>
                      <span className="text-xs text-muted-foreground ml-2">{a.userPhone}</span>
                    </div>
                    <button onClick={() => handleDelete(a.id)} className="p-1 text-muted-foreground hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Нет назначенных сотрудников</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Tab: Summary (KPI %, royalty date, assigned employee)
// ============================================================

function SummaryTab({ franchises }: { franchises: Franchisee[] }) {
  const { getAuthHeaders } = useAuth()
  const [kpis, setKpis] = useState<KPI[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const headers = getAuthHeaders()
      const [kpiRes, assignRes] = await Promise.all([
        fetch("/api/franchisee-kpi", { headers }),
        fetch("/api/franchise-assignments", { headers }),
      ])
      if (kpiRes.ok) setKpis(await kpiRes.json())
      if (assignRes.ok) setAssignments(await assignRes.json())
    } catch (error) {
      console.error("Error loading summary data:", error)
    } finally {
      setLoading(false)
    }
  }

  const calcKpiPercent = (franchiseeId: string) => {
    const franchiseeKpis = kpis.filter((k) => k.franchiseeId === franchiseeId)
    if (franchiseeKpis.length === 0) return null

    // Take the latest KPI
    const latest = franchiseeKpis[0]
    const metrics: number[] = []

    if (latest.targetRevenue && latest.targetRevenue > 0) {
      metrics.push(Math.min((latest.actualRevenue / latest.targetRevenue) * 100, 100))
    }
    if (latest.targetGames && latest.targetGames > 0) {
      metrics.push(Math.min((latest.actualGames / latest.targetGames) * 100, 100))
    }
    if (latest.maxExpenses && latest.maxExpenses > 0) {
      // For expenses, under target is good
      const expPct = latest.actualExpenses <= latest.maxExpenses ? 100 : Math.max(0, 100 - ((latest.actualExpenses - latest.maxExpenses) / latest.maxExpenses) * 100)
      metrics.push(expPct)
    }

    if (metrics.length === 0) return null
    return Math.round(metrics.reduce((a, b) => a + b, 0) / metrics.length)
  }

  const getAssignedEmployees = (franchiseeId: string) => {
    return assignments.filter((a) => a.franchiseeId === franchiseeId)
  }

  const periodLabel = (kpi: KPI) => {
    if (kpi.periodType === "month") {
      const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
      return `${months[kpi.periodNumber - 1]} ${kpi.periodYear}`
    }
    return `Q${kpi.periodNumber} ${kpi.periodYear}`
  }

  if (loading) return <p className="text-muted-foreground py-8 text-center">Загрузка сводки...</p>

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Сводный итог по каждому франчайзи</p>

      <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Франчайзи</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Город</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs">Выполнение KPI</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs">Период KPI</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs">Дата уплаты роялти</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Ответственный сотрудник УК</th>
            </tr>
          </thead>
          <tbody>
            {franchises.map((f) => {
              const kpiPct = calcKpiPercent(f.id)
              const employees = getAssignedEmployees(f.id)
              const latestKpi = kpis.find((k) => k.franchiseeId === f.id)

              return (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.city}</td>
                  <td className="px-4 py-3 text-center">
                    {kpiPct !== null ? (
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              kpiPct >= 80 ? "bg-green-500" : kpiPct >= 50 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${kpiPct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${
                          kpiPct >= 80 ? "text-green-600" : kpiPct >= 50 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {kpiPct}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Нет KPI</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {latestKpi ? (
                      <span className="text-xs text-muted-foreground">{periodLabel(latestKpi)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {f.royaltyPaymentDay ? (
                      <span className="text-sm font-medium">{f.royaltyPaymentDay}-е число</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Не задано</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {employees.length > 0 ? (
                      <div className="space-y-0.5">
                        {employees.map((e) => (
                          <div key={e.id} className="text-sm">
                            {e.userName}
                            <span className="text-xs text-muted-foreground ml-1">({e.userPhone})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Не назначен</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {franchises.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">Нет франчайзи</div>
      )}
    </div>
  )
}
