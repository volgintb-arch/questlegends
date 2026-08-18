"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2, RefreshCw, Star, MessageSquare } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

// Формат объекта review до конца не зафиксирован — seeker пока отдаёт []
// Разбираем защитно: пробуем самые вероятные поля (rating, comment,
// parentName, childName, gameId, venueName, createdAt) и просто скрываем
// пустые. Когда данные пойдут — доработаю компонент под фактический формат.
type Review = {
  id?: string
  rating?: number | null
  comment?: string | null
  parentName?: string | null
  childName?: string | null
  gameId?: string | null
  crmLeadId?: string | null
  venueName?: string | null
  createdAt?: string | null
}

type State =
  | { kind: "loading" }
  | { kind: "ok"; reviews: Review[]; total: number }
  | { kind: "not-ready" }
  | { kind: "upstream-down" }
  | { kind: "auth" }
  | { kind: "error"; message: string; status?: number }

function formatDate(v: string | null | undefined): string {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function Stars({ n }: { n: number }) {
  const rating = Math.max(0, Math.min(5, Math.round(n)))
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{n}</span>
    </div>
  )
}

export function PassportsReviews() {
  const { getAuthHeaders } = useAuth()
  const [state, setState] = useState<State>({ kind: "loading" })

  const load = async () => {
    setState({ kind: "loading" })
    try {
      const res = await fetch(`/api/passports/reviews`, { headers: getAuthHeaders() })
      if (res.status === 404) return setState({ kind: "not-ready" })
      if (res.status === 502) return setState({ kind: "upstream-down" })
      if (res.status === 401 || res.status === 403) return setState({ kind: "auth" })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return setState({ kind: "error", message: text || res.statusText, status: res.status })
      }
      const json = await res.json()
      const reviews: Review[] = json?.data?.reviews ?? json?.reviews ?? []
      const total: number = json?.data?.total ?? json?.total ?? reviews.length
      setState({ kind: "ok", reviews, total })
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
          <h2 className="text-lg font-semibold">Отзывы</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Отзывы родителей, оставленные через паспорт искателя после игры.
          </p>
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
          <div className="text-sm">Endpoint /api/admin/reviews ещё не построен на seeker (M5).</div>
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
          <div className="text-xs text-muted-foreground">
            Найдено отзывов: <span className="font-medium text-foreground">{state.total}</span>
          </div>
          {state.reviews.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 border border-dashed border-border rounded-lg bg-card text-muted-foreground">
              <MessageSquare className="w-6 h-6" />
              <div className="text-sm">Пока никто не оставил отзыв.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {state.reviews.map((r, i) => (
                <div key={r.id ?? i} className="border border-border rounded-lg bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {typeof r.rating === "number" && <Stars n={r.rating} />}
                      <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[r.parentName, r.childName && `↳ ${r.childName}`].filter(Boolean).join(" ")}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm">{r.comment}</p>}
                  {(r.venueName || r.crmLeadId) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                      {r.venueName && <span>{r.venueName}</span>}
                      {r.crmLeadId && (
                        <a
                          href={`/crm?leadId=${r.crmLeadId}`}
                          className="text-primary hover:underline"
                        >
                          → карточка в CRM
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
