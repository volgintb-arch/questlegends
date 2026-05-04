"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Download, Filter, TrendingUp, CheckCircle2, XCircle, Clock, Sparkles, CalendarCheck, RefreshCw } from "lucide-react"
import * as XLSX from "xlsx"
import { LEAD_SOURCES, prettifySource } from "@/lib/lead-sources"

type Status = "new" | "in_progress" | "approved" | "completed" | "cancelled"

interface Lead {
  id: string
  kind: "b2c" | "b2b"
  clientName: string
  clientPhone: string | null
  source: string | null
  createdAt: string
  currentStage: string | null
  stageType: string | null
  status: Status
  cancellationReason: string | null
  amount: number
  franchiseeName: string | null
  pipelineId: string | null
}

interface Summary {
  [source: string]: {
    total: number
    new: number
    inProgress: number
    approved: number
    completed: number
    cancelled: number
    revenue: number
  }
}

interface Franchisee {
  id: string
  name: string
  city?: string
}

const STATUS_LABEL: Record<Status, string> = {
  new: "Новый",
  in_progress: "В работе",
  approved: "Согласовано",
  completed: "Завершено",
  cancelled: "Отменён",
}

const STATUS_COLOR: Record<Status, string> = {
  new: "text-gray-500 bg-gray-500/10 border-gray-500/20",
  in_progress: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  approved: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  completed: "text-green-500 bg-green-500/10 border-green-500/20",
  cancelled: "text-red-500 bg-red-500/10 border-red-500/20",
}

export function MarketingLeadsReport() {
  const router = useRouter()
  const { user, getAuthHeaders } = useAuth()
  const isUK = user?.role === "uk" || user?.role === "super_admin" || user?.role === "uk_employee"

  const [leads, setLeads] = useState<Lead[]>([])
  const [summary, setSummary] = useState<Summary>({})
  const [dataSources, setDataSources] = useState<string[]>([])
  const [franchisees, setFranchisees] = useState<Franchisee[]>([])
  const [loading, setLoading] = useState(true)

  const [source, setSource] = useState("all")
  const [type, setType] = useState<"all" | "b2b" | "b2c">(isUK ? "all" : "b2c")
  const [status, setStatus] = useState<"all" | Status>("all")
  const [franchiseeId, setFranchiseeId] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    if (!isUK) return
    ;(async () => {
      try {
        const res = await fetch("/api/franchisees", { headers: getAuthHeaders() })
        if (res.ok) {
          const data = await res.json()
          setFranchisees(Array.isArray(data) ? data : data.data || [])
        }
      } catch (e) {
        console.error("Failed to load franchisees:", e)
      }
    })()
  }, [isUK]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (source !== "all") params.set("source", source)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      if (type !== "all") params.set("type", type)
      if (isUK && franchiseeId !== "all") params.set("franchiseeId", franchiseeId)

      const res = await fetch(`/api/marketing/leads-report?${params}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setLeads(data.data?.leads || [])
        setSummary(data.data?.summary || {})
        setDataSources(data.data?.sources || [])
      }
    } catch (e) {
      console.error("Failed to load marketing report:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, type, dateFrom, dateTo, franchiseeId])

  // Merge canonical sources with actual data sources for the filter dropdown
  const allSourceOptions = useMemo(() => {
    const canonical = new Set<string>(LEAD_SOURCES)
    const data = new Set(dataSources)
    const combined = new Set<string>([...canonical, ...data])
    return Array.from(combined).sort()
  }, [dataSources])

  const filteredLeads = useMemo(() => {
    if (status === "all") return leads
    return leads.filter((l) => l.status === status)
  }, [leads, status])

  const totals = useMemo(() => {
    const t = { total: 0, new: 0, inProgress: 0, approved: 0, completed: 0, cancelled: 0, revenue: 0 }
    Object.values(summary).forEach((s) => {
      t.total += s.total
      t.new += s.new
      t.inProgress += s.inProgress
      t.approved += s.approved
      t.completed += s.completed
      t.cancelled += s.cancelled
      t.revenue += s.revenue
    })
    return t
  }, [summary])

  // Click on lead → go to CRM with this lead
  const openLead = (lead: Lead) => {
    const params = new URLSearchParams()
    if (lead.pipelineId) params.set("pipelineId", lead.pipelineId)
    if (lead.kind === "b2c") {
      params.set("leadId", lead.id)
    } else {
      params.set("dealId", lead.id)
    }
    router.push(`/crm?${params}`)
  }

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()

    const summaryRows = Object.entries(summary)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([src, s]) => ({
        Источник: prettifySource(src === "(не указан)" ? null : src),
        Всего: s.total,
        Новые: s.new,
        "В работе": s.inProgress,
        Согласовано: s.approved,
        Завершено: s.completed,
        Отменено: s.cancelled,
        "Конверсия %": s.total > 0 ? ((s.completed / s.total) * 100).toFixed(1) + "%" : "0%",
        "Выручка ₽": s.revenue,
      }))
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
    summarySheet["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, summarySheet, "Сводка")

    const leadsRows = filteredLeads.map((l) => ({
      Тип: l.kind === "b2b" ? "B2B" : "B2C",
      Клиент: l.clientName,
      Телефон: l.clientPhone || "",
      Источник: prettifySource(l.source),
      "Дата создания": new Date(l.createdAt).toLocaleDateString("ru-RU"),
      "Текущий этап": l.currentStage || "",
      Статус: STATUS_LABEL[l.status],
      "Причина отказа": l.cancellationReason || "",
      Сумма: l.amount,
      Франчайзи: l.franchiseeName || "",
    }))
    const leadsSheet = XLSX.utils.json_to_sheet(leadsRows)
    leadsSheet["!cols"] = [
      { wch: 6 }, { wch: 25 }, { wch: 16 }, { wch: 18 }, { wch: 14 },
      { wch: 20 }, { wch: 13 }, { wch: 30 }, { wch: 12 }, { wch: 20 },
    ]
    XLSX.utils.book_append_sheet(wb, leadsSheet, "Лиды")

    const periodStr = dateFrom && dateTo ? `_${dateFrom}_${dateTo}` : "_все_время"
    XLSX.writeFile(wb, `Сводка_по_рекламе${periodStr}.xlsx`)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Сводка по рекламным источникам</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Отслеживание эффективности лидов из интеграций (Marquiz, Avito и др.)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadReport}
            disabled={loading}
            className="h-9 px-3 text-xs rounded-lg border border-border bg-transparent hover:bg-muted transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </button>
          <button
            onClick={exportExcel}
            disabled={filteredLeads.length === 0}
            className="h-9 px-3 text-xs rounded-lg gradient-primary text-white flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Экспорт Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />

          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-8 px-2 text-xs bg-background border border-border rounded outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Все источники</option>
            {allSourceOptions.map((s) => (
              <option key={s} value={s}>
                {prettifySource(s)}
              </option>
            ))}
          </select>

          {isUK && (
            <>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="h-8 px-2 text-xs bg-background border border-border rounded outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">B2B + B2C</option>
                <option value="b2c">Только B2C (игры)</option>
                <option value="b2b">Только B2B (франшиза)</option>
              </select>

              <select
                value={franchiseeId}
                onChange={(e) => setFranchiseeId(e.target.value)}
                className="h-8 px-2 text-xs bg-background border border-border rounded outline-none focus:ring-2 focus:ring-primary max-w-[200px]"
              >
                <option value="all">Все франчайзи</option>
                {franchisees.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.city ? ` — ${f.city}` : ""}
                  </option>
                ))}
              </select>
            </>
          )}

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="h-8 px-2 text-xs bg-background border border-border rounded outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Все статусы</option>
            <option value="new">Новый</option>
            <option value="in_progress">В работе</option>
            <option value="approved">Согласовано</option>
            <option value="completed">Завершено</option>
            <option value="cancelled">Отменён</option>
          </select>

          <div className="flex items-center gap-1.5 ml-auto">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 px-2 text-xs bg-background border border-border rounded outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 px-2 text-xs bg-background border border-border rounded outline-none focus:ring-2 focus:ring-primary"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo("") }}
                className="text-xs text-muted-foreground hover:text-foreground px-1"
                title="Сбросить даты"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Всего</span>
          </div>
          <p className="text-xl font-bold">{totals.total}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-muted-foreground">Новые</span>
          </div>
          <p className="text-xl font-bold">{totals.new}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">В работе</span>
          </div>
          <p className="text-xl font-bold text-blue-500">{totals.inProgress}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Согласовано</span>
          </div>
          <p className="text-xl font-bold text-purple-500">{totals.approved}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Завершено</span>
          </div>
          <p className="text-xl font-bold text-green-500">{totals.completed}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-muted-foreground">Отменено</span>
          </div>
          <p className="text-xl font-bold text-red-500">{totals.cancelled}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Выручка (по завершённым)</p>
            <p className="text-xl font-bold">{totals.revenue.toLocaleString("ru-RU")} ₽</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Конверсия</p>
            <p className="text-xl font-bold">
              {totals.total > 0 ? ((totals.completed / totals.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Summary by source */}
      {Object.keys(summary).length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold">По источникам</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Источник</th>
                  <th className="text-right px-3 py-2 font-medium">Всего</th>
                  <th className="text-right px-3 py-2 font-medium">Новые</th>
                  <th className="text-right px-3 py-2 font-medium text-blue-500">В работе</th>
                  <th className="text-right px-3 py-2 font-medium text-purple-500">Согласовано</th>
                  <th className="text-right px-3 py-2 font-medium text-green-500">Завершено</th>
                  <th className="text-right px-3 py-2 font-medium text-red-500">Отменено</th>
                  <th className="text-right px-3 py-2 font-medium">Конверсия</th>
                  <th className="text-right px-3 py-2 font-medium">Выручка</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([src, s]) => (
                    <tr key={src} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{prettifySource(src === "(не указан)" ? null : src)}</td>
                      <td className="px-3 py-2 text-right">{s.total}</td>
                      <td className="px-3 py-2 text-right">{s.new}</td>
                      <td className="px-3 py-2 text-right text-blue-500">{s.inProgress}</td>
                      <td className="px-3 py-2 text-right text-purple-500">{s.approved}</td>
                      <td className="px-3 py-2 text-right text-green-500">{s.completed}</td>
                      <td className="px-3 py-2 text-right text-red-500">{s.cancelled}</td>
                      <td className="px-3 py-2 text-right">
                        {s.total > 0 ? ((s.completed / s.total) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{s.revenue.toLocaleString("ru-RU")} ₽</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leads table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Список лидов ({filteredLeads.length})</h2>
          <span className="text-[10px] text-muted-foreground">Нажмите на лида чтобы открыть в CRM</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                {isUK && <th className="text-left px-3 py-2 font-medium">Тип</th>}
                <th className="text-left px-3 py-2 font-medium">Клиент</th>
                <th className="text-left px-3 py-2 font-medium">Телефон</th>
                <th className="text-left px-3 py-2 font-medium">Источник</th>
                {isUK && <th className="text-left px-3 py-2 font-medium">Франчайзи</th>}
                <th className="text-left px-3 py-2 font-medium">Создан</th>
                <th className="text-left px-3 py-2 font-medium">Этап</th>
                <th className="text-left px-3 py-2 font-medium">Статус</th>
                <th className="text-left px-3 py-2 font-medium">Причина отказа</th>
                <th className="text-right px-3 py-2 font-medium">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isUK ? 10 : 8} className="text-center py-8 text-muted-foreground">
                    Загрузка...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={isUK ? 10 : 8} className="text-center py-8 text-muted-foreground">
                    Нет лидов за выбранный период
                  </td>
                </tr>
              ) : (
                filteredLeads.map((l) => (
                  <tr
                    key={`${l.kind}-${l.id}`}
                    onClick={() => openLead(l)}
                    className="border-t border-border hover:bg-muted/40 cursor-pointer"
                  >
                    {isUK && (
                      <td className="px-3 py-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            l.kind === "b2b"
                              ? "text-purple-500 bg-purple-500/10 border-purple-500/20"
                              : "text-cyan-500 bg-cyan-500/10 border-cyan-500/20"
                          }`}
                        >
                          {l.kind === "b2b" ? "B2B" : "B2C"}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2 font-medium">{l.clientName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.clientPhone || "—"}</td>
                    <td className="px-3 py-2">{prettifySource(l.source)}</td>
                    {isUK && <td className="px-3 py-2 text-muted-foreground">{l.franchiseeName || "—"}</td>}
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(l.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-3 py-2">{l.currentStage || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLOR[l.status]}`}>
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate" title={l.cancellationReason || ""}>
                      {l.cancellationReason || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{l.amount.toLocaleString("ru-RU")} ₽</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
