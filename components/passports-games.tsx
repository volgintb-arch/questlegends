"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2, RefreshCw, Check, X, Film, Pencil, ExternalLink } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Reel = { url: string | null; readyAt: string | null }
type Venue = {
  id: string
  name: string | null
  address: string | null
  city: { slug: string; name: string; code?: string } | null
}
type Activations = {
  confirmed: number
  unconfirmed: number
  incomplete: number
  total: number
}
type Game = {
  id: string
  crmLeadId: string | null
  startsAt: string | null
  endsAt: string | null
  kidsCount: number
  groupType: "BIRTHDAY" | "CLASS" | "OPEN" | "CORPORATE" | null
  birthdayChildName: string | null
  schoolName: string | null
  schoolClass: string | null
  hostName: string | null
  adminName: string | null
  isCancelled: boolean
  reel: Reel | null
  venue: Venue | null
  activations: Activations | null
  activationRate: number | null
}

type State =
  | { kind: "loading" }
  | { kind: "ok"; games: Game[] }
  | { kind: "not-ready" }
  | { kind: "upstream-down" }
  | { kind: "auth" }
  | { kind: "error"; message: string; status?: number }

const GROUP_LABEL: Record<string, string> = {
  BIRTHDAY: "ДР",
  CLASS: "Класс",
  OPEN: "Открытая",
  CORPORATE: "Корпоратив",
}

const GROUP_COLOR: Record<string, string> = {
  BIRTHDAY: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  CLASS: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  OPEN: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  CORPORATE: "text-purple-500 bg-purple-500/10 border-purple-500/20",
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function PassportsGames() {
  const { getAuthHeaders } = useAuth()
  const [state, setState] = useState<State>({ kind: "loading" })
  const [editingReelId, setEditingReelId] = useState<string | null>(null)
  const [reelDraft, setReelDraft] = useState("")
  const [savingReel, setSavingReel] = useState(false)

  const load = async () => {
    setState({ kind: "loading" })
    try {
      const res = await fetch(`/api/passports/games`, { headers: getAuthHeaders() })
      if (res.status === 404) return setState({ kind: "not-ready" })
      if (res.status === 502) return setState({ kind: "upstream-down" })
      if (res.status === 401 || res.status === 403) return setState({ kind: "auth" })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return setState({ kind: "error", message: text || res.statusText, status: res.status })
      }
      const json = await res.json()
      const games: Game[] = json?.data?.games ?? json?.games ?? []
      setState({ kind: "ok", games })
    } catch (err: any) {
      setState({ kind: "error", message: String(err?.message ?? err) })
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startEditReel = (game: Game) => {
    setEditingReelId(game.id)
    setReelDraft(game.reel?.url ?? "")
  }
  const cancelEditReel = () => {
    setEditingReelId(null)
    setReelDraft("")
  }
  const saveReel = async (gameId: string) => {
    setSavingReel(true)
    try {
      const res = await fetch(`/api/passports/games/${gameId}/reel`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ url: reelDraft.trim() || null }),
      })
      if (!res.ok) {
        alert(`Не удалось сохранить: HTTP ${res.status}`)
        return
      }
      cancelEditReel()
      await load()
    } finally {
      setSavingReel(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Игры</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Список сыгранных игр из seeker-passport — активации по QR-монетам,
            статус подтверждения гостями, ссылка на рилс.
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
          Загрузка из seeker-passport…
        </div>
      )}

      {state.kind === "not-ready" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Endpoint /api/admin/games ещё не построен на seeker</div>
            <p className="text-muted-foreground mt-1">Появится в M5.</p>
          </div>
        </div>
      )}

      {state.kind === "upstream-down" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">seeker-passport недоступен</div>
            <p className="text-muted-foreground mt-1">Проверьте что сервис запущен и nginx проксирует passport.questlegends.ru.</p>
          </div>
        </div>
      )}

      {state.kind === "auth" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">seeker отклонил JWT</div>
            <p className="text-muted-foreground mt-1">Проверьте, что SEEKER_JWT_SECRET совпадает в обоих .env.</p>
          </div>
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
            Найдено игр: <span className="font-medium text-foreground">{state.games.length}</span>
          </div>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Дата/время</th>
                    <th className="text-left px-4 py-2 font-medium">Место</th>
                    <th className="text-left px-4 py-2 font-medium">Тип</th>
                    <th className="text-left px-4 py-2 font-medium">Кому</th>
                    <th className="text-left px-4 py-2 font-medium">Ведущий</th>
                    <th className="text-left px-4 py-2 font-medium">Админ</th>
                    <th className="text-right px-4 py-2 font-medium">Дети</th>
                    <th className="text-left px-4 py-2 font-medium">Активации</th>
                    <th className="text-left px-4 py-2 font-medium">CRM</th>
                    <th className="text-left px-4 py-2 font-medium">Рилс</th>
                  </tr>
                </thead>
                <tbody>
                  {state.games.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                        Игр не найдено
                      </td>
                    </tr>
                  ) : (
                    state.games.map((g) => {
                      const groupLabel = g.groupType ? GROUP_LABEL[g.groupType] ?? g.groupType : "—"
                      const groupColor = g.groupType ? GROUP_COLOR[g.groupType] ?? "" : ""
                      const kому =
                        g.groupType === "CLASS"
                          ? [g.schoolName, g.schoolClass].filter(Boolean).join(", ") || "—"
                          : g.birthdayChildName || "—"
                      const act = g.activations
                      const rate = g.activationRate ?? 0
                      const rateColor =
                        rate >= 0.7 ? "text-green-600" : rate >= 0.3 ? "text-amber-500" : "text-muted-foreground"
                      return (
                        <tr
                          key={g.id}
                          className={`border-t border-border hover:bg-muted/40 ${g.isCancelled ? "opacity-60" : ""}`}
                        >
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div>{formatDateTime(g.startsAt)}</div>
                            {g.isCancelled && (
                              <div className="text-[10px] text-red-500 font-medium mt-0.5">Отменена</div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-medium">{g.venue?.name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{g.venue?.city?.name || g.venue?.address || ""}</div>
                          </td>
                          <td className="px-4 py-2">
                            {g.groupType ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${groupColor}`}>
                                {groupLabel}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-2">{kому}</td>
                          <td className="px-4 py-2">{g.hostName || "—"}</td>
                          <td className="px-4 py-2">{g.adminName || "—"}</td>
                          <td className="px-4 py-2 text-right">{g.kidsCount ?? 0}</td>
                          <td className="px-4 py-2">
                            {act ? (
                              <div className="flex flex-col text-xs">
                                <span>
                                  <span className="text-green-600">{act.confirmed}</span>
                                  {" / "}
                                  <span className="text-foreground">{act.total}</span>
                                </span>
                                <span className={rateColor}>{Math.round(rate * 100)}%</span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {g.crmLeadId && !g.crmLeadId.startsWith("seed-") ? (
                              <a
                                href={`/crm?leadId=${encodeURIComponent(g.crmLeadId)}`}
                                className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                                title={`Открыть карточку ${g.crmLeadId}`}
                              >
                                <ExternalLink size={12} />
                                Открыть
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground" title={g.crmLeadId ?? ""}>
                                {g.crmLeadId?.startsWith("seed-") ? "seed" : "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 min-w-[200px]">
                            {editingReelId === g.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={reelDraft}
                                  onChange={(e) => setReelDraft(e.target.value)}
                                  placeholder="https://…"
                                  className="h-7 text-xs"
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveReel(g.id)}
                                  disabled={savingReel}
                                  className="text-green-600 hover:text-green-500 disabled:opacity-50"
                                  title="Сохранить"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={cancelEditReel}
                                  disabled={savingReel}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                                  title="Отмена"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : g.reel?.url ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={g.reel.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline text-xs flex items-center gap-1"
                                >
                                  <Film size={12} />
                                  Открыть
                                </a>
                                <button
                                  onClick={() => startEditReel(g)}
                                  className="text-muted-foreground hover:text-foreground"
                                  title="Изменить"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditReel(g)}
                                className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1"
                              >
                                <Film size={12} />
                                Добавить
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
