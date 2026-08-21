"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Trophy,
  MapPin,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// Правила лояльности BonusRule на стороне seeker-passport:
// «N-е посещение ребёнка → выдать бонус <title>». Правило уникально
// в паре (citySlug, milestone) — один город не может иметь два разных
// подарка на одно и то же посещение.

type BonusRule = {
  id: string
  citySlug: string
  cityName: string | null
  milestone: number
  title: string
  description: string | null
  expiresAfterDays: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

type Draft = {
  citySlug: string
  milestone: number
  title: string
  description: string | null
  expiresAfterDays: number
  isActive: boolean
}

const UK_ROLES = ["super_admin", "uk", "uk_employee"]

const emptyDraft: Draft = {
  citySlug: "",
  milestone: 1,
  title: "",
  description: null,
  expiresAfterDays: 365,
  isActive: true,
}

function BonusDialog({
  open,
  onClose,
  onSave,
  initial,
  saving,
  isUK,
  userCitySlug,
}: {
  open: boolean
  onClose: () => void
  onSave: (draft: Draft, id?: string) => Promise<void>
  initial: { id?: string; draft: Draft }
  saving: boolean
  isUK: boolean
  userCitySlug: string | null
}) {
  const [draft, setDraft] = useState<Draft>(initial.draft)

  useEffect(() => {
    setDraft(initial.draft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id, open])

  const canSave =
    draft.title.trim().length > 0 &&
    Number.isInteger(draft.milestone) &&
    draft.milestone >= 1 &&
    (isUK ? draft.citySlug.trim().length > 0 : true)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{initial.id ? "Редактирование правила" : "Новое правило"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Город</Label>
            {isUK ? (
              <Input
                className="mt-1"
                value={draft.citySlug}
                placeholder="barnaul / omsk"
                onChange={(e) => setDraft({ ...draft, citySlug: e.target.value.trim() })}
              />
            ) : (
              <div className="mt-1 px-3 py-2 bg-muted text-sm rounded border border-border text-muted-foreground truncate">
                {userCitySlug ?? "—"} (авто, ваш город)
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Посещение № *</Label>
            <Input
              type="number"
              min={1}
              step={1}
              className="mt-1"
              value={draft.milestone}
              onChange={(e) => setDraft({ ...draft, milestone: Math.max(1, Number(e.target.value) || 1) })}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Правило сработает при N-м визите ребёнка (уникально для города).
            </p>
          </div>
          <div>
            <Label className="text-xs">Заголовок *</Label>
            <Input
              className="mt-1"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Бесплатный сертификат на 10 000 ₽"
            />
          </div>
          <div>
            <Label className="text-xs">Описание</Label>
            <Textarea
              className="mt-1"
              rows={2}
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
              placeholder="Что именно получает искатель"
            />
          </div>
          <div>
            <Label className="text-xs">Срок действия бонуса, дней</Label>
            <Input
              type="number"
              min={1}
              step={1}
              className="mt-1"
              value={draft.expiresAfterDays}
              onChange={(e) => setDraft({ ...draft, expiresAfterDays: Math.max(1, Number(e.target.value) || 365) })}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Сколько дней после начисления бонус действителен. По умолчанию 365.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="bonus-active"
              checked={draft.isActive}
              onCheckedChange={(v) => setDraft({ ...draft, isActive: v === true })}
            />
            <Label htmlFor="bonus-active" className="text-sm cursor-pointer">
              Активно (правило срабатывает при новых визитах)
            </Label>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
            Отмена
          </Button>
          <Button
            onClick={() => onSave(draft, initial.id)}
            disabled={!canSave || saving}
            className="w-full sm:w-auto"
          >
            {saving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
            {initial.id ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PassportsBonusRules() {
  const { user, getAuthHeaders } = useAuth()
  const isUK = user ? UK_ROLES.includes(user.role) : false
  const [rules, setRules] = useState<BonusRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<"active" | "all">("active")
  const [dialog, setDialog] = useState<{ id?: string; draft: Draft } | null>(null)
  const [saving, setSaving] = useState(false)
  const [userCitySlug, setUserCitySlug] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (status === "all") qs.set("includeInactive", "true")
      const res = await fetch(`/api/passports/bonus-rules?${qs}`, { headers: getAuthHeaders() })
      if (res.status === 404) {
        setError("Endpoint /api/admin/bonus-rules ещё не построен на seeker.")
        return
      }
      if (res.status === 502) {
        setError("seeker недоступен.")
        return
      }
      if (res.status === 401 || res.status === 403) {
        setError("Нет доступа.")
        return
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "")
        setError(`HTTP ${res.status}: ${t || res.statusText}`)
        return
      }
      const json = await res.json()
      const list: BonusRule[] = json?.data?.rules ?? json?.rules ?? []
      setRules(list.sort((a, b) => a.milestone - b.milestone))
      if (!isUK) {
        const withCity = list.find((r) => r.citySlug)
        if (withCity?.citySlug) setUserCitySlug(withCity.citySlug)
      }
    } catch (err: any) {
      setError(String(err?.message ?? err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const filtered = useMemo(() => rules, [rules])

  const save = async (draft: Draft, id?: string) => {
    setSaving(true)
    try {
      const url = id ? `/api/passports/bonus-rules/${id}` : `/api/passports/bonus-rules`
      const method = id ? "PATCH" : "POST"
      const body: any = { ...draft }
      if (!isUK) delete body.citySlug // seeker auto-scope
      const res = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.status === 409) {
        alert(`Правило для ${draft.citySlug || userCitySlug} с посещением №${draft.milestone} уже существует.`)
        return
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "")
        alert(`Не удалось сохранить: HTTP ${res.status}\n${t}`)
        return
      }
      setDialog(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (rule: BonusRule) => {
    if (
      !confirm(
        `Удалить правило «N=${rule.milestone}: ${rule.title}»?\n\nУже выданные бонусы этого правила НЕ удаляются — они останутся у игроков с bonusRuleId=null.`,
      )
    )
      return
    const res = await fetch(`/api/passports/bonus-rules/${rule.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const t = await res.text().catch(() => "")
      alert(`Не удалось удалить: HTTP ${res.status}\n${t}`)
      return
    }
    await load()
  }

  const openAdd = () => {
    setDialog({
      draft: { ...emptyDraft, citySlug: isUK ? "" : userCitySlug ?? "" },
    })
  }

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Правила лояльности</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            «На N-м посещении ребёнка выдать бонус». Пара (город, номер посещения) уникальна — одно
            правило на один milestone в каждом городе.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="flex-1 sm:flex-initial">
            <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Обновить</span>
          </Button>
          <Button size="sm" onClick={openAdd} className="flex-1 sm:flex-initial">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Добавить</span>
            <span className="sm:hidden">Новое</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
          {(["active", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-2.5 sm:px-3 py-1.5 transition-colors ${
                status === s ? "bg-primary text-primary-foreground" : "bg-transparent hover:bg-muted"
              }`}
            >
              {s === "active" ? "Активные" : "Все"}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground p-6 border border-border rounded-lg bg-card">
          <Loader2 className="w-4 h-4 animate-spin" />
          Загрузка…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Не удалось загрузить</div>
            <p className="text-muted-foreground mt-1 break-all">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="text-xs text-muted-foreground">
            Найдено: <span className="font-medium text-foreground">{filtered.length}</span>
          </div>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Посещение</th>
                    <th className="text-left px-4 py-2 font-medium">Заголовок</th>
                    <th className="text-left px-4 py-2 font-medium">Город</th>
                    <th className="text-right px-4 py-2 font-medium">Срок, дн.</th>
                    <th className="text-left px-4 py-2 font-medium">Статус</th>
                    <th className="text-right px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Правил пока нет — добавьте первое
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr
                        key={r.id}
                        className={`border-t border-border hover:bg-muted/40 ${!r.isActive ? "opacity-60" : ""}`}
                      >
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono font-semibold">
                            <Trophy size={11} />
                            №{r.milestone}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="font-medium">{r.title}</div>
                          {r.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[420px]" title={r.description}>
                              {r.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <MapPin size={11} />
                            {r.cityName ?? r.citySlug}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-xs">{r.expiresAfterDays}</td>
                        <td className="px-4 py-2">
                          {r.isActive ? (
                            <span className="text-xs text-green-600">Активно</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Отключено</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <button
                            onClick={() =>
                              setDialog({
                                id: r.id,
                                draft: {
                                  citySlug: r.citySlug,
                                  milestone: r.milestone,
                                  title: r.title,
                                  description: r.description,
                                  expiresAfterDays: r.expiresAfterDays,
                                  isActive: r.isActive,
                                },
                              })
                            }
                            className="text-muted-foreground hover:text-foreground mr-2"
                            title="Редактировать"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => remove(r)}
                            className="text-destructive hover:text-destructive/80"
                            title="Удалить"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {dialog && (
        <BonusDialog
          open
          onClose={() => setDialog(null)}
          onSave={save}
          initial={dialog}
          saving={saving}
          isUK={isUK}
          userCitySlug={userCitySlug}
        />
      )}
    </div>
  )
}
