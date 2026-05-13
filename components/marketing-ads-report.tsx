"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  Download,
  Filter,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarCheck,
  RefreshCw,
  DollarSign,
  Target,
  AlertCircle,
} from "lucide-react"
import * as XLSX from "xlsx"

type Status = "new" | "in_progress" | "approved" | "completed" | "cancelled"

interface AdsLead {
  id: string
  kind: "b2c" | "b2b"
  clientName: string
  clientPhone: string | null
  createdAt: string
  currentStage: string | null
  status: Status
  cancellationReason: string | null
  amount: number
  franchiseeName: string | null
  pipelineId: string | null
  yclid: string | null
  gclid: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  referrer: string | null
}

interface Bucket {
  total: number
  new: number
  inProgress: number
  approved: number
  completed: number
  cancelled: number
  revenue: number
  conversionPct: number
  avgCheck: number
  cost: number
  cpl: number | null
  roas: number | null
  roi: number | null
}

interface DirectCampaign {
  campaignId: number | string
  name: string
  type?: string
  state?: string
  cost: number
  impressions?: number
  clicks?: number
  ctr?: number
  avgCpc?: number
  // Enriched server-side by matching utm_campaign on leads
  leads?: number
  completed?: number
  revenue?: number
  cpl?: number | null
  roas?: number | null
  roi?: number | null
}

interface DirectAd {
  adId: number | string
  campaignId?: number | string
  title1?: string
  title2?: string
  text?: string
  url?: string
  cost: number
  impressions?: number
  clicks?: number
}

interface StageBucket {
  stageName: string
  total: number
  new: number
  inProgress: number
  approved: number
  completed: number
  cancelled: number
  revenue: number
  conversionPct: number
  avgCheck: number
}

interface ApiResponse {
  success: boolean
  data: {
    totals: Bucket & { impressions: number | null; clicks: number | null }
    byCampaign: Array<Bucket & { utmCampaign: string; utmSource: string }>
    byContent: Array<Bucket & { utmContent: string; utmCampaign: string }>
    bySource: Array<Bucket & { utmSource: string }>
    byStage: StageBucket[]
    cancellationReasons: Array<{ reason: string; count: number; campaigns: string[] }>
    leads: AdsLead[]
    directCampaigns: DirectCampaign[]
    directAds: DirectAd[]
    availableDirectCampaigns?: Array<{ campaignId: number | string; name: string }>
    appliedFilters?: { directCampaign: string | null }
    costsAvailable: boolean
    botStatus?: {
      url: string
      ok: boolean
      error: string | null
    }
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

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("ru-RU")
}

function fmtPct(n: number | null | undefined) {
  if (n === null || n === undefined) return "—"
  return `${n}%`
}

export function MarketingAdsReport() {
  const router = useRouter()
  const { user, getAuthHeaders } = useAuth()
  const isUK = user?.role === "uk" || user?.role === "super_admin" || user?.role === "uk_employee"

  const [report, setReport] = useState<ApiResponse["data"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [franchisees, setFranchisees] = useState<Franchisee[]>([])

  const [type, setType] = useState<"all" | "b2b" | "b2c">(isUK ? "all" : "b2c")
  const [strict, setStrict] = useState(false)
  const [franchiseeId, setFranchiseeId] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  // Filter by a specific Я.Директ campaign (matched fuzzy by name)
  const [directCampaign, setDirectCampaign] = useState<string>("all")

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
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      if (type !== "all") params.set("type", type)
      if (strict) params.set("strict", "1")
      if (isUK && franchiseeId !== "all") params.set("franchiseeId", franchiseeId)
      if (directCampaign !== "all") params.set("directCampaign", directCampaign)

      const res = await fetch(`/api/marketing/ads-report?${params}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = (await res.json()) as ApiResponse
        setReport(data.data)
      }
    } catch (e) {
      console.error("Failed to load ads report:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, strict, dateFrom, dateTo, franchiseeId, directCampaign])

  const totals = report?.totals
  const costsAvailable = report?.costsAvailable ?? false

  const openLead = (lead: AdsLead) => {
    const params = new URLSearchParams()
    if (lead.pipelineId) params.set("pipelineId", lead.pipelineId)
    if (lead.kind === "b2c") params.set("leadId", lead.id)
    else params.set("dealId", lead.id)
    router.push(`/crm?${params}`)
  }

  const exportExcel = () => {
    if (!report) return
    const wb = XLSX.utils.book_new()

    // Sheet: По кампаниям
    const camRows = report.byCampaign.map((c) => ({
      Кампания: c.utmCampaign,
      Источник: c.utmSource,
      Лидов: c.total,
      Завершено: c.completed,
      Отменено: c.cancelled,
      "Конверсия %": c.conversionPct,
      Выручка: c.revenue,
      Расход: c.cost || "—",
      CPL: c.cpl ?? "—",
      "ROAS %": c.roas ?? "—",
      "ROI %": c.roi ?? "—",
    }))
    const camSheet = XLSX.utils.json_to_sheet(camRows)
    XLSX.utils.book_append_sheet(wb, camSheet, "Кампании")

    // Sheet: По объявлениям
    const cntRows = report.byContent.map((c) => ({
      Объявление: c.utmContent,
      Кампания: c.utmCampaign,
      Лидов: c.total,
      Завершено: c.completed,
      "Конверсия %": c.conversionPct,
      Выручка: c.revenue,
      CPL: c.cpl ?? "—",
      "ROI %": c.roi ?? "—",
    }))
    const cntSheet = XLSX.utils.json_to_sheet(cntRows)
    XLSX.utils.book_append_sheet(wb, cntSheet, "Объявления")

    // Sheet: По источникам
    const srcRows = report.bySource.map((s) => ({
      Источник: s.utmSource,
      Лидов: s.total,
      Завершено: s.completed,
      "Конверсия %": s.conversionPct,
      Выручка: s.revenue,
      CPL: s.cpl ?? "—",
      "ROI %": s.roi ?? "—",
    }))
    const srcSheet = XLSX.utils.json_to_sheet(srcRows)
    XLSX.utils.book_append_sheet(wb, srcSheet, "Источники")

    // Sheet: Лиды
    const leadsRows = report.leads.map((l) => ({
      Тип: l.kind === "b2b" ? "B2B" : "B2C",
      Клиент: l.clientName,
      Телефон: l.clientPhone || "",
      Кампания: l.utmCampaign || "",
      Объявление: l.utmContent || "",
      Источник: l.utmSource || "",
      yclid: l.yclid || "",
      gclid: l.gclid || "",
      Создан: new Date(l.createdAt).toLocaleDateString("ru-RU"),
      Этап: l.currentStage || "",
      Статус: STATUS_LABEL[l.status],
      "Причина отказа": l.cancellationReason || "",
      Сумма: l.amount,
      Франчайзи: l.franchiseeName || "",
    }))
    const leadsSheet = XLSX.utils.json_to_sheet(leadsRows)
    XLSX.utils.book_append_sheet(wb, leadsSheet, "Лиды")

    const period = dateFrom && dateTo ? `_${dateFrom}_${dateTo}` : "_все_время"
    XLSX.writeFile(wb, `Реклама${period}.xlsx`)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Аналитика рекламы</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Лиды из Яндекс.Директ, Google Ads и других платных источников. CPL/ROI считается по данным от бота интеграции.
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
            disabled={!report || report.leads.length === 0}
            className="h-9 px-3 text-xs rounded-lg gradient-primary text-white flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Экспорт Excel
          </button>
        </div>
      </div>

      {/* Cost-source banner */}
      {!loading && !costsAvailable && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium">Стоимость рекламы недоступна</div>
            <div className="mt-0.5 opacity-90">
              CPL/ROI отображаются как «—». Конверсия и выручка считаются по лидам в любом случае.
            </div>
            {report?.botStatus?.error && (
              <div className="mt-1.5 font-mono text-[10px] break-all">
                <span className="opacity-70">{report.botStatus.url}</span>
                <br />
                <span className="text-red-500">→ {report.botStatus.error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />

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
                    {f.name}{f.city ? ` — ${f.city}` : ""}
                  </option>
                ))}
              </select>
            </>
          )}

          <select
            value={directCampaign}
            onChange={(e) => setDirectCampaign(e.target.value)}
            className="h-8 px-2 text-xs bg-background border border-border rounded outline-none focus:ring-2 focus:ring-primary max-w-[260px]"
            title="Фильтр по рекламной кампании Я.Директ"
          >
            <option value="all">Все кампании Я.Директ</option>
            {(report?.availableDirectCampaigns || []).map((c) => (
              <option key={String(c.campaignId)} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={strict}
              onChange={(e) => setStrict(e.target.checked)}
              className="cursor-pointer"
            />
            <span title="Только лиды с yclid или gclid (точная атрибуция)">
              Только yclid/gclid
            </span>
          </label>

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

      {/* KPI top row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Лидов</span>
          </div>
          <p className="text-xl font-bold">{fmt(totals?.total)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Завершено</span>
          </div>
          <p className="text-xl font-bold text-green-500">{fmt(totals?.completed)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">В работе</span>
          </div>
          <p className="text-xl font-bold text-blue-500">{fmt((totals?.new || 0) + (totals?.inProgress || 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Согласовано</span>
          </div>
          <p className="text-xl font-bold text-purple-500">{fmt(totals?.approved)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-muted-foreground">Отменено</span>
          </div>
          <p className="text-xl font-bold text-red-500">{fmt(totals?.cancelled)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Конверсия</span>
          </div>
          <p className="text-xl font-bold">{fmtPct(totals?.conversionPct)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Выручка</span>
          </div>
          <p className="text-xl font-bold">{fmt(totals?.revenue)} ₽</p>
        </div>
      </div>

      {/* Money KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-xs text-muted-foreground">Расход на рекламу</span>
          <p className="text-xl font-bold mt-1">{costsAvailable ? `${fmt(totals?.cost)} ₽` : "—"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-xs text-muted-foreground">CPL (стоимость лида)</span>
          <p className="text-xl font-bold mt-1">{totals?.cpl != null ? `${fmt(totals.cpl)} ₽` : "—"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-xs text-muted-foreground">ROAS</span>
          <p className={`text-xl font-bold mt-1 ${totals?.roas != null && totals.roas >= 100 ? "text-green-500" : ""}`}>
            {totals?.roas != null ? `${fmt(totals.roas)}%` : "—"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-xs text-muted-foreground">ROI</span>
          <p className={`text-xl font-bold mt-1 ${totals?.roi != null && totals.roi >= 0 ? "text-green-500" : totals?.roi != null ? "text-red-500" : ""}`}>
            {totals?.roi != null ? `${fmt(totals.roi)}%` : "—"}
          </p>
        </div>
      </div>

      {/* By Campaign table */}
      {report && report.byCampaign.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold">По кампаниям</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Кампания</th>
                  <th className="text-left px-3 py-2 font-medium">Источник</th>
                  <th className="text-right px-3 py-2 font-medium">Лидов</th>
                  <th className="text-right px-3 py-2 font-medium text-green-500">Завершено</th>
                  <th className="text-right px-3 py-2 font-medium text-red-500">Отказ</th>
                  <th className="text-right px-3 py-2 font-medium">Конв.</th>
                  <th className="text-right px-3 py-2 font-medium">Выручка</th>
                  <th className="text-right px-3 py-2 font-medium">Расход</th>
                  <th className="text-right px-3 py-2 font-medium">CPL</th>
                  <th className="text-right px-3 py-2 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {report.byCampaign.map((c, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{c.utmCampaign}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.utmSource}</td>
                    <td className="px-3 py-2 text-right">{c.total}</td>
                    <td className="px-3 py-2 text-right text-green-500">{c.completed}</td>
                    <td className="px-3 py-2 text-right text-red-500">{c.cancelled}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(c.conversionPct)}</td>
                    <td className="px-3 py-2 text-right">{fmt(c.revenue)} ₽</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{c.cost > 0 ? `${fmt(c.cost)} ₽` : "—"}</td>
                    <td className="px-3 py-2 text-right">{c.cpl != null ? `${fmt(c.cpl)} ₽` : "—"}</td>
                    <td className={`px-3 py-2 text-right ${c.roi != null && c.roi >= 0 ? "text-green-500" : c.roi != null ? "text-red-500" : ""}`}>
                      {c.roi != null ? `${fmt(c.roi)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By Content table */}
      {report && report.byContent.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold">По объявлениям</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Объявление</th>
                  <th className="text-left px-3 py-2 font-medium">Кампания</th>
                  <th className="text-right px-3 py-2 font-medium">Лидов</th>
                  <th className="text-right px-3 py-2 font-medium text-green-500">Завершено</th>
                  <th className="text-right px-3 py-2 font-medium">Конв.</th>
                  <th className="text-right px-3 py-2 font-medium">Выручка</th>
                  <th className="text-right px-3 py-2 font-medium">CPL</th>
                  <th className="text-right px-3 py-2 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {report.byContent.map((c, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{c.utmContent}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.utmCampaign}</td>
                    <td className="px-3 py-2 text-right">{c.total}</td>
                    <td className="px-3 py-2 text-right text-green-500">{c.completed}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(c.conversionPct)}</td>
                    <td className="px-3 py-2 text-right">{fmt(c.revenue)} ₽</td>
                    <td className="px-3 py-2 text-right">{c.cpl != null ? `${fmt(c.cpl)} ₽` : "—"}</td>
                    <td className={`px-3 py-2 text-right ${c.roi != null && c.roi >= 0 ? "text-green-500" : c.roi != null ? "text-red-500" : ""}`}>
                      {c.roi != null ? `${fmt(c.roi)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By Stage — детально, какие лиды на каком этапе сейчас */}
      {report && report.byStage && report.byStage.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold">По этапам воронки</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Распределение всех рекламных лидов по текущим этапам CRM — видно где они "застревают"
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Этап</th>
                  <th className="text-right px-3 py-2 font-medium">Лидов</th>
                  <th className="text-right px-3 py-2 font-medium">% от всех</th>
                  <th className="text-right px-3 py-2 font-medium">Конверсия в продажу</th>
                  <th className="text-right px-3 py-2 font-medium">Выручка</th>
                </tr>
              </thead>
              <tbody>
                {report.byStage.map((s, i) => {
                  const totalLeads = report.totals?.total || 0
                  const sharePct = totalLeads > 0 ? ((s.total / totalLeads) * 100).toFixed(1) : "0"
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{s.stageName}</td>
                      <td className="px-3 py-2 text-right">{s.total}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{sharePct}%</td>
                      <td className="px-3 py-2 text-right">{fmtPct(s.conversionPct)}</td>
                      <td className="px-3 py-2 text-right">{fmt(s.revenue)} ₽</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Direct campaigns — все кампании Я.Директ от бота, даже без лидов */}
      {report && report.directCampaigns && report.directCampaigns.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold">Кампании Я.Директ (от бота)</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Сырые данные расхода/показов/кликов по каждой кампании из Я.Директ
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Название</th>
                  <th className="text-left px-3 py-2 font-medium">Тип</th>
                  <th className="text-left px-3 py-2 font-medium">Статус</th>
                  <th className="text-right px-3 py-2 font-medium">Показы</th>
                  <th className="text-right px-3 py-2 font-medium">Клики</th>
                  <th className="text-right px-3 py-2 font-medium">CTR</th>
                  <th className="text-right px-3 py-2 font-medium">Ср. CPC</th>
                  <th className="text-right px-3 py-2 font-medium">Расход</th>
                  <th className="text-right px-3 py-2 font-medium">Лидов</th>
                  <th className="text-right px-3 py-2 font-medium">CPL</th>
                  <th className="text-right px-3 py-2 font-medium">Выручка</th>
                  <th className="text-right px-3 py-2 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {report.directCampaigns.map((c) => (
                  <tr
                    key={String(c.campaignId)}
                    onClick={() => setDirectCampaign(directCampaign === c.name ? "all" : c.name)}
                    className={`border-t border-border cursor-pointer hover:bg-muted/40 transition-colors ${
                      directCampaign === c.name ? "bg-primary/5" : ""
                    }`}
                    title="Нажмите чтобы отфильтровать страницу по этой кампании"
                  >
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-muted-foreground text-[10px]">{c.type || "—"}</td>
                    <td className="px-3 py-2 text-[10px]">
                      <span className={c.state === "ON" ? "text-green-500" : "text-muted-foreground"}>
                        {c.state || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{fmt(c.impressions)}</td>
                    <td className="px-3 py-2 text-right">{fmt(c.clicks)}</td>
                    <td className="px-3 py-2 text-right">{c.ctr != null ? `${c.ctr}%` : "—"}</td>
                    <td className="px-3 py-2 text-right">{c.avgCpc != null ? `${fmt(c.avgCpc)} ₽` : "—"}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmt(c.cost)} ₽</td>
                    <td className="px-3 py-2 text-right">{fmt(c.leads ?? 0)}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {c.cpl != null ? `${fmt(c.cpl)} ₽` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{fmt(c.revenue ?? 0)} ₽</td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        c.roi == null ? "" : c.roi >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {c.roi != null ? `${c.roi}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By Source + Cancellation reasons side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {report && report.bySource.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-3 border-b border-border">
              <h2 className="text-sm font-semibold">По источникам</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Источник</th>
                    <th className="text-right px-3 py-2 font-medium">Лидов</th>
                    <th className="text-right px-3 py-2 font-medium">Конв.</th>
                    <th className="text-right px-3 py-2 font-medium">Выручка</th>
                    <th className="text-right px-3 py-2 font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bySource.map((s, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{s.utmSource}</td>
                      <td className="px-3 py-2 text-right">{s.total}</td>
                      <td className="px-3 py-2 text-right">{fmtPct(s.conversionPct)}</td>
                      <td className="px-3 py-2 text-right">{fmt(s.revenue)} ₽</td>
                      <td className={`px-3 py-2 text-right ${s.roi != null && s.roi >= 0 ? "text-green-500" : s.roi != null ? "text-red-500" : ""}`}>
                        {s.roi != null ? `${fmt(s.roi)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {report && report.cancellationReasons.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-3 border-b border-border">
              <h2 className="text-sm font-semibold">Топ причин отказа</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Причина</th>
                    <th className="text-right px-3 py-2 font-medium">Кол-во</th>
                    <th className="text-left px-3 py-2 font-medium">Кампании</th>
                  </tr>
                </thead>
                <tbody>
                  {report.cancellationReasons.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2">{r.reason}</td>
                      <td className="px-3 py-2 text-right text-red-500">{r.count}</td>
                      <td className="px-3 py-2 text-muted-foreground text-[10px]">
                        {r.campaigns.slice(0, 3).join(", ")}
                        {r.campaigns.length > 3 && ` +${r.campaigns.length - 3}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* По этапам воронки */}
      {report && report.byStage && report.byStage.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold">По этапам воронки</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Где сейчас находятся рекламные лиды
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Этап</th>
                  <th className="text-right px-3 py-2 font-medium">Лидов</th>
                  <th className="text-right px-3 py-2 font-medium">Конверсия</th>
                  <th className="text-right px-3 py-2 font-medium">Выручка</th>
                  <th className="text-right px-3 py-2 font-medium">Ср. чек</th>
                </tr>
              </thead>
              <tbody>
                {report.byStage.map((s) => (
                  <tr key={s.stageName} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{s.stageName}</td>
                    <td className="px-3 py-2 text-right">{fmt(s.total)}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(s.conversionPct)}</td>
                    <td className="px-3 py-2 text-right">{fmt(s.revenue)} ₽</td>
                    <td className="px-3 py-2 text-right">{fmt(s.avgCheck)} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leads list */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Все рекламные лиды ({report?.leads.length || 0})</h2>
          <span className="text-[10px] text-muted-foreground">Нажмите на лида чтобы открыть в CRM</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                {isUK && <th className="text-left px-3 py-2 font-medium">Тип</th>}
                <th className="text-left px-3 py-2 font-medium">Клиент</th>
                <th className="text-left px-3 py-2 font-medium">Кампания</th>
                <th className="text-left px-3 py-2 font-medium">Объявление</th>
                <th className="text-left px-3 py-2 font-medium">yclid/gclid</th>
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
                  <td colSpan={isUK ? 10 : 9} className="text-center py-8 text-muted-foreground">
                    Загрузка...
                  </td>
                </tr>
              ) : !report || report.leads.length === 0 ? (
                <tr>
                  <td colSpan={isUK ? 10 : 9} className="text-center py-8 text-muted-foreground">
                    Нет рекламных лидов за выбранный период
                  </td>
                </tr>
              ) : (
                report.leads.map((l) => (
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
                    <td className="px-3 py-2 text-muted-foreground">{l.utmCampaign || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.utmContent || "—"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground font-mono max-w-[140px] truncate" title={l.yclid || l.gclid || ""}>
                      {l.yclid ? `Y:${l.yclid.slice(0, 8)}…` : l.gclid ? `G:${l.gclid.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(l.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{l.currentStage || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLOR[l.status]}`}>
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate" title={l.cancellationReason || ""}>
                      {l.cancellationReason || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{fmt(l.amount)} ₽</td>
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
