"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2, RefreshCw, Check, X, Film, Pencil, ExternalLink, Copy } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

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
  activationCode: string | null // D-011
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

type EditableFields = {
  hostName: string | null
  adminName: string | null
  birthdayChildName: string | null
  schoolName: string | null
  schoolClass: string | null
}

export function PassportsGames() {
  const { getAuthHeaders } = useAuth()
  const [state, setState] = useState<State>({ kind: "loading" })
  const [editingReelId, setEditingReelId] = useState<string | null>(null)
  const [reelDraft, setReelDraft] = useState("")
  const [savingReel, setSavingReel] = useState(false)
  const [editGame, setEditGame] = useState<Game | null>(null)
  const [editDraft, setEditDraft] = useState<EditableFields | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

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
                    <th className="text-right px-4 py-2 font-medium">Дети</th>
                    <th className="text-left px-4 py-2 font-medium">Код</th>
                    <th className="text-left px-4 py-2 font-medium">Активации</th>
                    <th className="text-left px-4 py-2 font-medium">CRM</th>
                    <th className="text-left px-4 py-2 font-medium">Рилс</th>
                    <th className="text-right px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {state.games.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        Игр не найдено
                      </td>
                    </tr>
                  ) : (
                    state.games.map((g) => {
                      const groupLabel = g.groupType ? GROUP_LABEL[g.groupType] ?? g.groupType : "—"
                      const groupColor = g.groupType ? GROUP_COLOR[g.groupType] ?? "" : ""
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
                          <td className="px-4 py-2 text-right">{g.kidsCount ?? 0}</td>
                          <td className="px-4 py-2">
                            {g.activationCode ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-base tracking-wider text-primary">
                                  {g.activationCode}
                                </span>
                                <button
                                  onClick={() => {
                                    void navigator.clipboard.writeText(g.activationCode!)
                                  }}
                                  className="text-muted-foreground hover:text-foreground"
                                  title="Скопировать код"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
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
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => {
                                setEditGame(g)
                                setEditDraft({
                                  hostName: g.hostName,
                                  adminName: g.adminName,
                                  birthdayChildName: g.birthdayChildName,
                                  schoolName: g.schoolName,
                                  schoolClass: g.schoolClass,
                                })
                              }}
                              className="text-muted-foreground hover:text-foreground"
                              title="Редактировать (ведущий, админ, имениник, школа)"
                            >
                              <Pencil size={14} />
                            </button>
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

      {editGame && editDraft && (
        <Dialog open onOpenChange={(o) => { if (!o) { setEditGame(null); setEditDraft(null) } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Редактирование игры</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Правится только seeker-часть игры (5 полей). Остальное — venue, дата, kidsCount,
                статус — идут из CRM и меняются там же.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Ведущий</Label>
                  <Input
                    className="mt-1"
                    maxLength={120}
                    value={editDraft.hostName ?? ""}
                    onChange={(e) => setEditDraft({ ...editDraft, hostName: e.target.value || null })}
                    placeholder="Дмитрий"
                  />
                </div>
                <div>
                  <Label className="text-xs">Администратор</Label>
                  <Input
                    className="mt-1"
                    maxLength={120}
                    value={editDraft.adminName ?? ""}
                    onChange={(e) => setEditDraft({ ...editDraft, adminName: e.target.value || null })}
                    placeholder="Ирина"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Именник (для BIRTHDAY)</Label>
                <Input
                  className="mt-1"
                  maxLength={120}
                  value={editDraft.birthdayChildName ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, birthdayChildName: e.target.value || null })}
                  placeholder="Мира"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                <div>
                  <Label className="text-xs">Школа (для CLASS)</Label>
                  <Input
                    className="mt-1"
                    maxLength={120}
                    value={editDraft.schoolName ?? ""}
                    onChange={(e) => setEditDraft({ ...editDraft, schoolName: e.target.value || null })}
                    placeholder="Школа №42"
                  />
                </div>
                <div>
                  <Label className="text-xs">Класс</Label>
                  <Input
                    className="mt-1"
                    maxLength={20}
                    value={editDraft.schoolClass ?? ""}
                    onChange={(e) => setEditDraft({ ...editDraft, schoolClass: e.target.value || null })}
                    placeholder="3А"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => { setEditGame(null); setEditDraft(null) }}
                disabled={savingEdit}
                className="w-full sm:w-auto"
              >
                Отмена
              </Button>
              <Button
                disabled={savingEdit}
                onClick={async () => {
                  // Собираем только реально изменившиеся поля — иначе 422 empty patch.
                  const patch: Partial<EditableFields> = {}
                  const orig: EditableFields = {
                    hostName: editGame.hostName,
                    adminName: editGame.adminName,
                    birthdayChildName: editGame.birthdayChildName,
                    schoolName: editGame.schoolName,
                    schoolClass: editGame.schoolClass,
                  }
                  ;(Object.keys(orig) as (keyof EditableFields)[]).forEach((k) => {
                    if ((editDraft[k] ?? null) !== (orig[k] ?? null)) patch[k] = editDraft[k] ?? null
                  })
                  if (Object.keys(patch).length === 0) {
                    setEditGame(null)
                    setEditDraft(null)
                    return
                  }
                  setSavingEdit(true)
                  try {
                    const res = await fetch(`/api/passports/games/${editGame.id}`, {
                      method: "PATCH",
                      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                      body: JSON.stringify(patch),
                    })
                    if (!res.ok) {
                      const t = await res.text().catch(() => "")
                      alert(`Не удалось сохранить: HTTP ${res.status}\n${t}`)
                      return
                    }
                    setEditGame(null)
                    setEditDraft(null)
                    await load()
                  } finally {
                    setSavingEdit(false)
                  }
                }}
                className="w-full sm:w-auto"
              >
                {savingEdit && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
