"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  IdCard,
  Users,
  Camera,
  Trophy,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts"

type Totals = {
  games: number
  kids: number
  confirmed: number
  activationRate: number
  // Расширенные поля (добавлены на seeker в /api/admin/metrics)
  passports?: number
  parents?: number
  returningParents?: number
  returningRate?: number
  photosUploaded?: number
  photoRate?: number
}
type Bucket = {
  key: string
  label: string
  gamesCount: number
  kidsTotal: number
  confirmedTotal: number
  activationRate: number
}
type DailyPoint = {
  day: string // YYYY-MM-DD
  passportsIssued: number
  attendances: number
}
type Metrics = {
  range: { from: string; to: string }
  totals: Totals
  byVenue: Bucket[]
  byAdmin: Bucket[]
  daily?: DailyPoint[]
}

type State =
  | { kind: "loading" }
  | { kind: "ok"; metrics: Metrics }
  | { kind: "not-ready" }
  | { kind: "upstream-down" }
  | { kind: "auth" }
  | { kind: "error"; message: string; status?: number }

type SortKey = "label" | "gamesCount" | "kidsTotal" | "confirmedTotal" | "activationRate"
type SortDir = "asc" | "desc"

function rateColor(rate: number): string {
  if (rate >= 0.7) return "text-green-600"
  if (rate >= 0.3) return "text-amber-500"
  if (rate > 0) return "text-orange-500"
  return "text-muted-foreground"
}

function formatDate(v: string): string {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function formatDayShort(v: string): string {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  color = "text-foreground",
}: {
  icon: any
  label: string
  value: string | number
  hint?: string
  color?: string
}) {
  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-2 ${color}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  )
}

function pct(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "—"
  return `${Math.round(rate * 1000) / 10}%`
}

function sortBuckets(rows: Bucket[], sortBy: SortKey, dir: SortDir): Bucket[] {
  const mult = dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = a[sortBy]
    const vb = b[sortBy]
    if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * mult
    return ((Number(va) || 0) - (Number(vb) || 0)) * mult
  })
}

function BucketTable({ title, buckets }: { title: string; buckets: Bucket[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("kidsTotal")
  const [dir, setDir] = useState<SortDir>("desc")
  const sorted = useMemo(() => sortBuckets(buckets, sortBy, dir), [buckets, sortBy, dir])
  const totalKids = buckets.reduce((s, b) => s + b.kidsTotal, 0)

  // Топ-3 по activationRate — независимо от текущей сортировки таблицы.
  const top3Ids = useMemo(() => {
    const byRate = [...buckets]
      .filter((b) => b.gamesCount > 0) // 100% на 1 игре — шум, отсекаем пустые
      .sort((a, b) => b.activationRate - a.activationRate)
      .slice(0, 3)
      .map((b) => b.key)
    return new Set(byRate)
  }, [buckets])

  const clickSort = (key: SortKey) => {
    if (sortBy === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(key)
      setDir(key === "label" ? "asc" : "desc")
    }
  }

  const SortHeader = ({ k, children, align }: { k: SortKey; children: any; align?: "right" }) => (
    <th className={`px-4 py-2 font-medium ${align === "right" ? "text-right" : "text-left"} select-none`}>
      <button
        onClick={() => clickSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground uppercase text-xs"
      >
        {children}
        {sortBy === k && (dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </button>
    </th>
  )

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <SortHeader k="label">Название</SortHeader>
              <SortHeader k="gamesCount" align="right">Игр</SortHeader>
              <SortHeader k="kidsTotal" align="right">Детей</SortHeader>
              <SortHeader k="confirmedTotal" align="right">Подтв.</SortHeader>
              <SortHeader k="activationRate" align="right">Rate</SortHeader>
              <th className="text-right px-4 py-2 font-medium">Доля детей</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Пусто
                </td>
              </tr>
            ) : (
              sorted.map((b) => {
                const share = totalKids > 0 ? b.kidsTotal / totalKids : 0
                const isTop = top3Ids.has(b.key)
                return (
                  <tr key={b.key} className={`border-t border-border ${isTop ? "bg-amber-500/5" : ""}`}>
                    <td className="px-4 py-2 font-medium">
                      <div className="flex items-center gap-2">
                        {isTop && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5"
                            title="Топ-3 по activation rate"
                          >
                            <Trophy size={10} />
                            TOP
                          </span>
                        )}
                        <span>{b.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">{b.gamesCount}</td>
                    <td className="px-4 py-2 text-right">{b.kidsTotal}</td>
                    <td className="px-4 py-2 text-right">{b.confirmedTotal}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${rateColor(b.activationRate)}`}>
                      {pct(b.activationRate)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${share * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {Math.round(share * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DailyChart({ points }: { points: DailyPoint[] }) {
  // Дефолт — последние 30 дней. Если seeker вернул меньше — берём что есть.
  const data = useMemo(() => {
    const tail = points.slice(-30)
    return tail.map((p) => ({
      day: p.day,
      dayShort: formatDayShort(p.day),
      Паспорта: p.passportsIssued,
      Посещения: p.attendances,
    }))
  }, [points])

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground text-center">
        Нет данных по дням
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Динамика по дням (последние {data.length})</h3>
      </div>
      <div className="p-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="dayShort" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={30} />
            <RechartsTooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(_v, payload) => payload?.[0]?.payload?.day ?? ""}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="Паспорта"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="Посещения"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function PassportsMetrics() {
  const { getAuthHeaders } = useAuth()
  const [state, setState] = useState<State>({ kind: "loading" })

  const load = async () => {
    setState({ kind: "loading" })
    try {
      const res = await fetch(`/api/passports/metrics`, { headers: getAuthHeaders() })
      if (res.status === 404) return setState({ kind: "not-ready" })
      if (res.status === 502) return setState({ kind: "upstream-down" })
      if (res.status === 401 || res.status === 403) return setState({ kind: "auth" })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return setState({ kind: "error", message: text || res.statusText, status: res.status })
      }
      const json = await res.json()
      const metrics: Metrics = json?.data ?? json
      setState({ kind: "ok", metrics })
    } catch (err: any) {
      setState({ kind: "error", message: String(err?.message ?? err) })
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Метрики</h2>
          {state.kind === "ok" && (
            <p className="text-sm text-muted-foreground mt-1">
              Период: {formatDate(state.metrics.range.from)} — {formatDate(state.metrics.range.to)}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={state.kind === "loading"}>
          <RefreshCw className={`w-4 h-4 mr-2 ${state.kind === "loading" ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 text-muted-foreground p-6 border border-border rounded-lg bg-card">
          <Loader2 className="w-4 h-4 animate-spin" />
          Загрузка…
        </div>
      )}

      {state.kind === "not-ready" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">Endpoint /api/admin/metrics ещё не построен на seeker (M5).</div>
        </div>
      )}

      {state.kind === "upstream-down" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">seeker-passport недоступен.</div>
        </div>
      )}

      {state.kind === "auth" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">seeker отклонил JWT. Проверьте SEEKER_JWT_SECRET в обоих .env.</div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Ошибка{state.status ? ` (HTTP ${state.status})` : ""}</div>
            <p className="text-muted-foreground mt-1 break-all">{state.message}</p>
          </div>
        </div>
      )}

      {state.kind === "ok" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={TrendingUp}
              label="Активации"
              value={`${state.metrics.totals.confirmed} / ${state.metrics.totals.kids}`}
              hint={`${pct(state.metrics.totals.activationRate)} от числа детей`}
              color={rateColor(state.metrics.totals.activationRate)}
            />
            <StatCard
              icon={IdCard}
              label="Паспортов выдано"
              value={state.metrics.totals.passports ?? "—"}
              hint={
                state.metrics.totals.parents != null
                  ? `${state.metrics.totals.parents} родителей`
                  : undefined
              }
            />
            <StatCard
              icon={Users}
              label="Родителей узнали"
              value={pct(state.metrics.totals.returningRate)}
              hint={
                state.metrics.totals.returningParents != null && state.metrics.totals.parents != null
                  ? `${state.metrics.totals.returningParents} из ${state.metrics.totals.parents}`
                  : undefined
              }
              color={rateColor(state.metrics.totals.returningRate ?? 0)}
            />
            <StatCard
              icon={Camera}
              label="С фото"
              value={pct(state.metrics.totals.photoRate)}
              hint={
                state.metrics.totals.photosUploaded != null && state.metrics.totals.passports != null
                  ? `${state.metrics.totals.photosUploaded} из ${state.metrics.totals.passports}`
                  : undefined
              }
              color={rateColor(state.metrics.totals.photoRate ?? 0)}
            />
          </div>

          {state.metrics.daily && state.metrics.daily.length > 0 && (
            <DailyChart points={state.metrics.daily} />
          )}

          <BucketTable title="По площадкам" buckets={state.metrics.byVenue || []} />
          <BucketTable title="По администраторам" buckets={state.metrics.byAdmin || []} />
        </>
      )}
    </div>
  )
}
