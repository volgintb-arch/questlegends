"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  User as UserIcon,
  Calendar,
  Search as SearchIcon,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// UNCONFIRMED-активации: родитель прошёл challenge, но не смог сам
// подтвердить игру (не нашёл её в списке / неверно ввёл дату). Админ на
// площадке видит их, находит правильную игру и вручную привязывает.

type UnconfirmedActivation = {
  id: string
  sessionId?: string
  status: "UNCONFIRMED" | "INCOMPLETE" | "CONFIRMED"
  role?: string
  confirmedBy?: string | null
  attemptCount?: number
  createdAt: string
  passport: {
    id: string
    displayNumber: string
    childName: string
    childBirthdate?: string | null
    citySlug: string
    cityName: string | null
    parent?: { id: string; phone: string | null; email?: string | null } | null
  }
  game?: { id: string; startsAt: string | null; venueName?: string | null } | null
}

type GameChoice = {
  id: string
  startsAt: string | null
  endsAt: string | null
  venue: string | null
  groupType: string | null
  activationCode: string | null
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ok"; items: UnconfirmedActivation[] }
  | { kind: "empty" }
  | { kind: "not-ready" }
  | { kind: "error"; message: string }

function formatDateTime(v: string | null | undefined): string {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(v: string | null | undefined): string {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString("ru-RU")
}

export function PassportsActivationConfirm() {
  const { getAuthHeaders } = useAuth()
  const [state, setState] = useState<LoadState>({ kind: "loading" })
  const [confirmActivation, setConfirmActivation] = useState<UnconfirmedActivation | null>(null)
  const [games, setGames] = useState<GameChoice[]>([])
  const [gamesLoading, setGamesLoading] = useState(false)
  const [pickedGameId, setPickedGameId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [gameFilter, setGameFilter] = useState("")

  const load = async () => {
    setState({ kind: "loading" })
    try {
      const res = await fetch(`/api/passports/activations?status=UNCONFIRMED`, {
        headers: getAuthHeaders(),
      })
      if (res.status === 404) return setState({ kind: "not-ready" })
      if (res.status === 502) return setState({ kind: "error", message: "seeker недоступен" })
      if (res.status === 401 || res.status === 403) return setState({ kind: "error", message: "Нет доступа" })
      if (!res.ok) {
        const t = await res.text().catch(() => "")
        return setState({ kind: "error", message: `HTTP ${res.status}: ${t || res.statusText}` })
      }
      const json = await res.json()
      const items: UnconfirmedActivation[] = json?.data?.activations ?? json?.activations ?? []
      if (items.length === 0) return setState({ kind: "empty" })
      setState({ kind: "ok", items })
    } catch (err: any) {
      setState({ kind: "error", message: String(err?.message ?? err) })
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openConfirm = async (act: UnconfirmedActivation) => {
    setConfirmActivation(act)
    setPickedGameId(null)
    setGameFilter("")
    setGamesLoading(true)
    setGames([])
    try {
      // Тянем игры того же города, ±30 дней от активации — админу удобнее
      // выбирать из релевантного списка чем из всех игр.
      const created = new Date(act.createdAt)
      const from = new Date(created.getTime() - 30 * 86_400_000).toISOString().slice(0, 10)
      const to = new Date(created.getTime() + 30 * 86_400_000).toISOString().slice(0, 10)
      const qs = new URLSearchParams({ from, to })
      // citySlug seeker и так добавит из JWT — но если UK, сузим по паспорту
      qs.set("citySlug", act.passport.citySlug)
      const res = await fetch(`/api/passports/games?${qs}`, { headers: getAuthHeaders() })
      if (!res.ok) return
      const json = await res.json()
      const raw: any[] = json?.data?.games ?? json?.games ?? []
      const list: GameChoice[] = raw.map((g) => ({
        id: g.id,
        startsAt: g.startsAt,
        endsAt: g.endsAt,
        venue: g.venue?.name ?? null,
        groupType: g.groupType ?? null,
        activationCode: g.activationCode ?? null,
      }))
      // Сортируем по дате, ближайшие к активации сверху.
      list.sort((a, b) => {
        const ta = a.startsAt ? new Date(a.startsAt).getTime() : 0
        const tb = b.startsAt ? new Date(b.startsAt).getTime() : 0
        return Math.abs(ta - created.getTime()) - Math.abs(tb - created.getTime())
      })
      setGames(list)
    } finally {
      setGamesLoading(false)
    }
  }

  const closeConfirm = () => {
    setConfirmActivation(null)
    setPickedGameId(null)
    setGames([])
    setGameFilter("")
  }

  const doConfirm = async () => {
    if (!confirmActivation || !pickedGameId) return
    setConfirming(true)
    try {
      const res = await fetch(`/api/passports/activations/${confirmActivation.id}/confirm`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: pickedGameId }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => "")
        alert(`Не удалось подтвердить: HTTP ${res.status}\n${t}`)
        return
      }
      closeConfirm()
      await load()
    } finally {
      setConfirming(false)
    }
  }

  const filteredGames = useMemo(() => {
    if (!gameFilter.trim()) return games
    const q = gameFilter.trim().toLowerCase()
    return games.filter(
      (g) =>
        (g.venue ?? "").toLowerCase().includes(q) ||
        (g.activationCode ?? "").toLowerCase().includes(q) ||
        (g.startsAt ?? "").includes(q),
    )
  }, [games, gameFilter])

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Незавершённые активации</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Родитель прошёл challenge, но не смог указать игру (не нашёл в списке или ошибся). Найдите
            правильную игру и подтвердите — родитель получит паспорт активированным.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={state.kind === "loading"} className="shrink-0">
          <RefreshCw className={`w-4 h-4 sm:mr-2 ${state.kind === "loading" ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Обновить</span>
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
          <div className="text-sm">
            Endpoint /api/admin/activations ещё не построен на seeker (или другой путь). Как только выкатите — вкладка заработает.
          </div>
        </div>
      )}

      {state.kind === "empty" && (
        <div className="flex items-center gap-3 p-6 border border-dashed border-border rounded-lg bg-card text-muted-foreground">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div className="text-sm">Всё чисто — незавершённых активаций нет.</div>
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
            Найдено: <span className="font-medium text-foreground">{state.items.length}</span>
          </div>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Создана</th>
                    <th className="text-left px-4 py-2 font-medium">Паспорт</th>
                    <th className="text-left px-4 py-2 font-medium">Ребёнок</th>
                    <th className="text-left px-4 py-2 font-medium">Город</th>
                    <th className="text-left px-4 py-2 font-medium">Родитель</th>
                    <th className="text-right px-4 py-2 font-medium">Попыток</th>
                    <th className="text-right px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((a) => {
                    const parent = a.passport.parent
                    return (
                      <tr key={a.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-4 py-2 whitespace-nowrap text-xs">{formatDateTime(a.createdAt)}</td>
                        <td className="px-4 py-2 font-mono text-xs">{a.passport.displayNumber}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <UserIcon size={11} />
                            <span>{a.passport.childName}</span>
                          </div>
                          {a.passport.childBirthdate && (
                            <div className="text-[11px] text-muted-foreground">
                              ДР {formatDate(a.passport.childBirthdate)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs">{a.passport.cityName ?? a.passport.citySlug}</td>
                        <td className="px-4 py-2 text-xs">
                          {parent?.phone ? (
                            <div className="flex flex-col gap-0.5">
                              <a href={`tel:${parent.phone}`} className="hover:text-primary">
                                {parent.phone}
                              </a>
                              {parent.email && (
                                <a href={`mailto:${parent.email}`} className="hover:text-primary text-muted-foreground">
                                  {parent.email}
                                </a>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-xs">
                          {typeof a.attemptCount === "number" ? (
                            <span
                              className={
                                a.attemptCount >= 3
                                  ? "text-amber-500 font-semibold"
                                  : "text-muted-foreground"
                              }
                              title={a.attemptCount >= 3 ? "Родитель сильно пытался — стоит помочь" : ""}
                            >
                              {a.attemptCount}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button size="sm" onClick={() => openConfirm(a)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Подтвердить
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!confirmActivation} onOpenChange={(o) => !o && closeConfirm()}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Выбор игры для активации</DialogTitle>
          </DialogHeader>
          {confirmActivation && (
            <div className="space-y-3">
              <div className="text-sm bg-muted/40 rounded p-3">
                <div className="font-mono text-xs">{confirmActivation.passport.displayNumber}</div>
                <div className="mt-0.5">
                  <UserIcon size={11} className="inline mr-1" />
                  {confirmActivation.passport.childName}
                  <span className="text-xs text-muted-foreground ml-2">
                    {confirmActivation.passport.cityName ?? confirmActivation.passport.citySlug}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Активация от {formatDateTime(confirmActivation.createdAt)}
                </div>
              </div>

              <div>
                <Label className="text-xs">Игра (±30 дней от активации, город паспорта)</Label>
                <div className="relative mt-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={gameFilter}
                    onChange={(e) => setGameFilter(e.target.value)}
                    placeholder="Место, код, дата…"
                    className="pl-9 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="border border-border rounded max-h-[320px] overflow-y-auto">
                {gamesLoading ? (
                  <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загружаем игры…
                  </div>
                ) : filteredGames.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Игр не найдено</div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredGames.map((g) => (
                      <label
                        key={g.id}
                        className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40 ${
                          pickedGameId === g.id ? "bg-primary/5" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="pick-game"
                          checked={pickedGameId === g.id}
                          onChange={() => setPickedGameId(g.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            <Calendar size={11} className="inline mr-1" />
                            {formatDateTime(g.startsAt)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{g.venue || "—"}</div>
                          {g.activationCode && (
                            <div className="text-[11px] font-mono text-primary mt-0.5">
                              код {g.activationCode}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeConfirm} disabled={confirming} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button onClick={doConfirm} disabled={!pickedGameId || confirming} className="w-full sm:w-auto">
              {confirming && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              Подтвердить активацию
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
