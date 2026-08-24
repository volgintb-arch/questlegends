"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2, RefreshCw, Search, Phone, Mail, Send, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

type Passport = {
  id: string
  displayNumber: string
  childName: string
  childBirthdate: string | null
  totem: string | null
  issuedAt: string | null
  status: string
  expeditionsCount: number
  city: { slug: string; name: string; code?: string } | null
  parent: { id: string; phone: string | null; email: string | null; hasTelegram: boolean } | null
}

type State =
  | { kind: "loading" }
  | { kind: "ok"; passports: Passport[] }
  | { kind: "not-ready" }
  | { kind: "upstream-down" }
  | { kind: "auth" }
  | { kind: "error"; message: string; status?: number }

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-green-600 bg-green-500/10 border-green-500/20",
  ARCHIVED: "text-muted-foreground bg-muted border-border",
  REVOKED: "text-red-500 bg-red-500/10 border-red-500/20",
}

const TOTEM_EMOJI: Record<string, string> = {
  tapir: "🦥",
  serpent: "🐍",
  eagle: "🦅",
  wolf: "🐺",
  bear: "🐻",
  fox: "🦊",
  owl: "🦉",
}

function formatDate(v: string | null): string {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString("ru-RU")
}

export function PassportsSearch() {
  const { getAuthHeaders } = useAuth()
  const [query, setQuery] = useState("")
  const [state, setState] = useState<State>({ kind: "loading" })
  const [deleteTarget, setDeleteTarget] = useState<Passport | null>(null)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const [deleteReason, setDeleteReason] = useState("")
  const [deleting, setDeleting] = useState(false)

  const load = async (q: string) => {
    setState({ kind: "loading" })
    try {
      const url = q ? `/api/passports/passports?q=${encodeURIComponent(q)}` : `/api/passports/passports`
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (res.status === 404) return setState({ kind: "not-ready" })
      if (res.status === 502) return setState({ kind: "upstream-down" })
      if (res.status === 401 || res.status === 403) return setState({ kind: "auth" })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return setState({ kind: "error", message: text || res.statusText, status: res.status })
      }
      const json = await res.json()
      const passports: Passport[] = json?.data?.passports ?? json?.passports ?? []
      setState({ kind: "ok", passports })
    } catch (err: any) {
      setState({ kind: "error", message: String(err?.message ?? err) })
    }
  }

  useEffect(() => {
    load("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Поиск паспорта</h2>
          <p className="text-sm text-muted-foreground mt-1">
            По номеру (БРН26 — 000029), имени ребёнка или телефону родителя.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(query)} disabled={state.kind === "loading"}>
          <RefreshCw className={`w-4 h-4 mr-2 ${state.kind === "loading" ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load(query.trim())
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="БРН26 — 000029, Иван, +7913…"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={state.kind === "loading"}>
          Найти
        </Button>
      </form>

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 text-muted-foreground p-6 border border-border rounded-lg bg-card">
          <Loader2 className="w-4 h-4 animate-spin" />
          Загрузка…
        </div>
      )}

      {state.kind === "not-ready" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">Endpoint /api/admin/passports ещё не построен на seeker (M5).</div>
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
            Найдено паспортов: <span className="font-medium text-foreground">{state.passports.length}</span>
          </div>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Номер</th>
                    <th className="text-left px-4 py-2 font-medium">Ребёнок</th>
                    <th className="text-left px-4 py-2 font-medium">Тотем</th>
                    <th className="text-left px-4 py-2 font-medium">Город</th>
                    <th className="text-left px-4 py-2 font-medium">Родитель</th>
                    <th className="text-right px-4 py-2 font-medium">Экспед.</th>
                    <th className="text-left px-4 py-2 font-medium">Статус</th>
                    <th className="text-left px-4 py-2 font-medium">Выдан</th>
                    <th className="text-right px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {state.passports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        Ничего не найдено
                      </td>
                    </tr>
                  ) : (
                    state.passports.map((p) => (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{p.displayNumber}</td>
                        <td className="px-4 py-2">
                          <div className="font-medium">{p.childName}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(p.childBirthdate)}</div>
                        </td>
                        <td className="px-4 py-2">
                          <span title={p.totem ?? ""}>
                            {p.totem ? `${TOTEM_EMOJI[p.totem] ?? "🎫"} ${p.totem}` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2">{p.city?.name || "—"}</td>
                        <td className="px-4 py-2">
                          {p.parent ? (
                            <div className="flex flex-col gap-0.5 text-xs">
                              {p.parent.phone && (
                                <a href={`tel:${p.parent.phone}`} className="flex items-center gap-1 hover:text-primary">
                                  <Phone size={11} />
                                  {p.parent.phone}
                                </a>
                              )}
                              {p.parent.email && (
                                <a href={`mailto:${p.parent.email}`} className="flex items-center gap-1 hover:text-primary">
                                  <Mail size={11} />
                                  {p.parent.email}
                                </a>
                              )}
                              {p.parent.hasTelegram && (
                                <span className="flex items-center gap-1 text-primary">
                                  <Send size={11} />
                                  TG
                                </span>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">{p.expeditionsCount ?? 0}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${
                              STATUS_COLOR[p.status] ?? "text-muted-foreground bg-muted border-border"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs whitespace-nowrap">{formatDate(p.issuedAt)}</td>
                        <td className="px-4 py-2 text-right">
                          {p.status !== "DELETED" && (
                            <button
                              onClick={() => {
                                setDeleteTarget(p)
                                setDeleteConfirmed(false)
                                setDeleteReason("")
                              }}
                              className="text-destructive hover:text-destructive/80"
                              title="Удалить паспорт (152-ФЗ)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 152-ФЗ удаление паспорта */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null)
            setDeleteConfirmed(false)
            setDeleteReason("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500">
              Удаление паспорта {deleteTarget?.displayNumber} ({deleteTarget?.childName})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="bg-red-500/5 border border-red-500/20 rounded p-3 text-red-600 text-xs space-y-1">
              <div className="font-medium">Что будет удалено (безвозвратно):</div>
              <ul className="list-disc pl-4">
                <li>Passport.status = DELETED, childName стирается</li>
                <li>Фото удаляется с диска</li>
                <li>Бонусы паспорта → EXPIRED</li>
                <li>Kid-slugs revoked, отзывы отвязываются</li>
                <li>Если последний паспорт родителя — scrub Parent (phone hash, email/tg null)</li>
              </ul>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="del-confirm"
                checked={deleteConfirmed}
                onCheckedChange={(v) => setDeleteConfirmed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="del-confirm" className="text-sm cursor-pointer">
                Понимаю, что данные будут стёрты безвозвратно
              </Label>
            </div>
            <div>
              <Label className="text-xs">Причина (min 5 символов, попадёт в audit-log)</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Запрос родителя на удаление данных по 152-ФЗ, обращение №…"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteConfirmed || deleteReason.trim().length < 5 || deleting}
              onClick={async () => {
                if (!deleteTarget) return
                setDeleting(true)
                try {
                  const res = await fetch(`/api/passports/passports/${deleteTarget.id}/delete`, {
                    method: "POST",
                    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: deleteReason.trim() }),
                  })
                  if (!res.ok) {
                    const t = await res.text().catch(() => "")
                    alert(`Не удалось удалить: HTTP ${res.status}\n${t}`)
                    return
                  }
                  setDeleteTarget(null)
                  setDeleteConfirmed(false)
                  setDeleteReason("")
                  await load(query)
                } finally {
                  setDeleting(false)
                }
              }}
              className="w-full sm:w-auto"
            >
              {deleting && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              Удалить безвозвратно
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
