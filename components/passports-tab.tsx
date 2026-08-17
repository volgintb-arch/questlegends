"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

// Общий компонент для всех вкладок «Паспорта». Все разделы пока просто
// пробуют дёрнуть свой seeker-admin эндпоинт через прокси
// /api/passports/*. Пока seeker M5 не выкатил их — получим 404 из seeker'а,
// покажем понятную заглушку. Как только endpoint появится — здесь начнёт
// рендериться реальный JSON, и можно будет доделать красивое UI отдельно
// на каждую вкладку.

type TabDescriptor = {
  id: string
  label: string
  path: string
  description: string
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: unknown }
  | { kind: "not-ready" } // 404 от seeker'а — endpoint ещё не построен
  | { kind: "upstream-down" } // 502 от нашего proxy — seeker недоступен
  | { kind: "auth" } // 401/403
  | { kind: "error"; message: string; status?: number }

export function PassportsTab({ tab }: { tab: TabDescriptor }) {
  const { getAuthHeaders } = useAuth()
  const [state, setState] = useState<State>({ kind: "idle" })

  const load = async () => {
    setState({ kind: "loading" })
    try {
      const res = await fetch(`/api/passports/${tab.path}`, {
        headers: getAuthHeaders(),
      })
      if (res.status === 404) {
        setState({ kind: "not-ready" })
        return
      }
      if (res.status === 502) {
        setState({ kind: "upstream-down" })
        return
      }
      if (res.status === 401 || res.status === 403) {
        setState({ kind: "auth" })
        return
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        setState({ kind: "error", message: text || res.statusText, status: res.status })
        return
      }
      const data = await res.json().catch(() => null)
      setState({ kind: "ok", data })
    } catch (err: any) {
      setState({ kind: "error", message: String(err?.message ?? err) })
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id])

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{tab.label}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{tab.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={state.kind === "loading"}>
          <RefreshCw className={`w-4 h-4 mr-2 ${state.kind === "loading" ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-card p-6">
        {state.kind === "loading" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Загрузка из seeker-passport…
          </div>
        )}

        {state.kind === "not-ready" && (
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">Раздел в разработке</div>
              <p className="text-muted-foreground mt-1">
                Админ-эндпоинт{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/admin/{tab.path}</code>{" "}
                на стороне seeker-passport ещё не выкатан (запланирован в M5).
                Как только появится — раздел заработает без изменений в
                questlegends.
              </p>
            </div>
          </div>
        )}

        {state.kind === "upstream-down" && (
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">seeker-passport недоступен</div>
              <p className="text-muted-foreground mt-1">
                Не удалось достучаться до{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">{process.env.NEXT_PUBLIC_SEEKER_URL || "seeker-passport"}</code>.
                Проверьте что сервис запущен и nginx проксирует
                <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">passport.questlegends.ru</code>.
              </p>
            </div>
          </div>
        )}

        {state.kind === "auth" && (
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">Нет доступа</div>
              <p className="text-muted-foreground mt-1">
                seeker отклонил JWT. Проверьте что{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">SEEKER_JWT_SECRET</code>{" "}
                совпадает в обоих{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code>.
              </p>
            </div>
          </div>
        )}

        {state.kind === "error" && (
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">
                Ошибка{state.status ? ` (HTTP ${state.status})` : ""}
              </div>
              <p className="text-muted-foreground mt-1 break-all">{state.message}</p>
            </div>
          </div>
        )}

        {state.kind === "ok" && state.data != null && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Сырые данные от seeker — UI будет доделан на этот раздел когда
              endpoint стабилизируется:
            </div>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[600px]">
              {JSON.stringify(state.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
