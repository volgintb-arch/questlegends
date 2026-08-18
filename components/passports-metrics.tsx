"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2, RefreshCw, TrendingUp, Users, CheckCircle2, Gamepad2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

type Totals = { games: number; kids: number; confirmed: number; activationRate: number }
type Bucket = {
  key: string
  label: string
  gamesCount: number
  kidsTotal: number
  confirmedTotal: number
  activationRate: number
}
type Metrics = {
  range: { from: string; to: string }
  totals: Totals
  byVenue: Bucket[]
  byAdmin: Bucket[]
}

type State =
  | { kind: "loading" }
  | { kind: "ok"; metrics: Metrics }
  | { kind: "not-ready" }
  | { kind: "upstream-down" }
  | { kind: "auth" }
  | { kind: "error"; message: string; status?: number }

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

function BucketTable({ title, buckets }: { title: string; buckets: Bucket[] }) {
  const totalKids = buckets.reduce((s, b) => s + b.kidsTotal, 0)
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Название</th>
              <th className="text-right px-4 py-2 font-medium">Игр</th>
              <th className="text-right px-4 py-2 font-medium">Детей</th>
              <th className="text-right px-4 py-2 font-medium">Подтв.</th>
              <th className="text-right px-4 py-2 font-medium">Rate</th>
              <th className="text-right px-4 py-2 font-medium">Доля детей</th>
            </tr>
          </thead>
          <tbody>
            {buckets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Пусто
                </td>
              </tr>
            ) : (
              buckets.map((b) => {
                const share = totalKids > 0 ? b.kidsTotal / totalKids : 0
                return (
                  <tr key={b.key} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{b.label}</td>
                    <td className="px-4 py-2 text-right">{b.gamesCount}</td>
                    <td className="px-4 py-2 text-right">{b.kidsTotal}</td>
                    <td className="px-4 py-2 text-right">{b.confirmedTotal}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${rateColor(b.activationRate)}`}>
                      {Math.round(b.activationRate * 1000) / 10}%
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
            <StatCard icon={Gamepad2} label="Игр" value={state.metrics.totals.games} />
            <StatCard icon={Users} label="Детей" value={state.metrics.totals.kids} />
            <StatCard icon={CheckCircle2} label="Подтверждено" value={state.metrics.totals.confirmed} color="text-green-600" />
            <StatCard
              icon={TrendingUp}
              label="Activation rate"
              value={`${Math.round(state.metrics.totals.activationRate * 1000) / 10}%`}
              color={rateColor(state.metrics.totals.activationRate)}
              hint="доля детей, чьи родители дошли до активации"
            />
          </div>

          <BucketTable title="По площадкам" buckets={state.metrics.byVenue || []} />
          <BucketTable title="По администраторам" buckets={state.metrics.byAdmin || []} />
        </>
      )}
    </div>
  )
}
