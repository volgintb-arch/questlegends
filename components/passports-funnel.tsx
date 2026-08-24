"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2, RefreshCw, TrendingDown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type FunnelStage = {
  key: string
  label: string
  count: number
  fromStart: number
  fromPrev: number
}

type FunnelData = {
  range: { from: string; to: string }
  citySlug: string | null
  totals: { sessionsInScope: number }
  stages: FunnelStage[]
}

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: FunnelData }
  | { kind: "not-ready" }
  | { kind: "error"; message: string }

function pct1(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

// Цвет по величине "падения" (1 − fromPrev): чем сильнее просело —
// тем сочнее оттенок для наглядности.
function dropColor(fromPrev: number): string {
  const drop = 1 - fromPrev
  if (drop <= 0.1) return "text-green-600"
  if (drop <= 0.3) return "text-amber-500"
  if (drop <= 0.6) return "text-orange-500"
  return "text-red-500"
}

// Дефолт: последние 30 дней (использует seeker, если from/to не указаны).
function defaultRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to.getTime() - 30 * 86_400_000)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export function PassportsFunnel() {
  const { getAuthHeaders } = useAuth()
  const [state, setState] = useState<State>({ kind: "loading" })
  const defR = defaultRange()
  const [from, setFrom] = useState(defR.from)
  const [to, setTo] = useState(defR.to)

  const load = async () => {
    setState({ kind: "loading" })
    try {
      const qs = new URLSearchParams()
      if (from) qs.set("from", from)
      if (to) qs.set("to", to)
      const res = await fetch(`/api/passports/funnel?${qs}`, { headers: getAuthHeaders() })
      if (res.status === 404) return setState({ kind: "not-ready" })
      if (res.status === 502) return setState({ kind: "error", message: "seeker недоступен" })
      if (res.status === 401 || res.status === 403) return setState({ kind: "error", message: "Нет доступа" })
      if (!res.ok) {
        const t = await res.text().catch(() => "")
        return setState({ kind: "error", message: `HTTP ${res.status}: ${t || res.statusText}` })
      }
      const json = await res.json()
      const data: FunnelData = json?.data ?? json
      setState({ kind: "ok", data })
    } catch (err: any) {
      setState({ kind: "error", message: String(err?.message ?? err) })
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Воронка</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            От скана QR-монеты до отправленного отзыва. Крупные проседы «от предыдущего шага» — куда
            копать в первую очередь.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={state.kind === "loading"} className="shrink-0">
          <RefreshCw className={`w-4 h-4 sm:mr-2 ${state.kind === "loading" ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Обновить</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2 bg-muted/30 border border-border rounded-lg p-3">
        <div>
          <Label className="text-xs">С</Label>
          <Input type="date" className="mt-1 h-8 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">По</Label>
          <Input type="date" className="mt-1 h-8 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button size="sm" onClick={load} disabled={state.kind === "loading"}>
          Применить
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
          <div className="text-sm">Endpoint /api/admin/funnel ещё не построен на seeker.</div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Ошибка</div>
            <p className="text-muted-foreground mt-1 break-all">{state.message}</p>
          </div>
        </div>
      )}

      {state.kind === "ok" && (
        <>
          <div className="text-xs text-muted-foreground">
            Сессий в scope: <span className="font-medium text-foreground">{state.data.totals.sessionsInScope}</span>
            {state.data.citySlug && (
              <span className="ml-2">
                · город: <span className="font-medium text-foreground">{state.data.citySlug}</span>
              </span>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 space-y-2">
              {state.data.stages.map((s, i) => {
                const widthPct = s.fromStart * 100 // % ширины бара относительно первого шага
                const isFirst = i === 0
                const dropFromPrev = 1 - s.fromPrev
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-medium truncate">{s.label}</span>
                      <div className="flex items-center gap-3 text-muted-foreground shrink-0">
                        <span className="font-mono">{s.count}</span>
                        {!isFirst && (
                          <span className={`inline-flex items-center gap-0.5 font-mono ${dropColor(s.fromPrev)}`}>
                            <TrendingDown size={11} />
                            {pct1(dropFromPrev)}
                          </span>
                        )}
                        <span className="font-mono w-14 text-right">{pct1(s.fromStart)}</span>
                      </div>
                    </div>
                    <div className="relative h-6 bg-muted/40 rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/70 transition-all"
                        style={{ width: `${Math.max(widthPct, 0.5)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            «От предыдущего» — конверсия из шага выше. Красное — сильный сброс, стоит разобраться. Значения &gt;100%
            (например у отзывов) — это норма: отзыв может оставить и тот, кто не завершил активацию.
          </div>
        </>
      )}
    </div>
  )
}
