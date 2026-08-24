"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Pencil,
  MapPin,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// Venue появляется автоматически при первой игре — админ здесь только
// правит имя/адрес (опечатки после автосоздания из CRM) и заполняет
// URL'ы 2ГИС/Яндекса. Без этих URL родителю не показывается кнопка
// «Оставить отзыв» → воронка S6 стоит.

type Venue = {
  id: string
  citySlug: string
  cityName: string | null
  name: string
  address: string | null
  reviewGis: string | null
  reviewYandex: string | null
  isActive: boolean
}

type EditableFields = Pick<Venue, "name" | "address" | "reviewGis" | "reviewYandex" | "isActive">

type State =
  | { kind: "loading" }
  | { kind: "ok"; venues: Venue[] }
  | { kind: "not-ready" }
  | { kind: "error"; message: string }

function ReviewIcon({ url, label }: { url: string | null; label: string }) {
  if (!url) {
    return (
      <span
        className="inline-flex items-center gap-1 text-muted-foreground/60 text-xs"
        title={`${label}: не заполнено`}
      >
        <XCircle size={13} />
        {label}
      </span>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-green-600 hover:text-green-500 text-xs"
      title={url}
      onClick={(e) => e.stopPropagation()}
    >
      <CheckCircle2 size={13} />
      {label}
      <ExternalLink size={10} />
    </a>
  )
}

export function PassportsVenues() {
  const { getAuthHeaders } = useAuth()
  const [state, setState] = useState<State>({ kind: "loading" })
  const [status, setStatus] = useState<"active" | "all">("active")
  const [editVenue, setEditVenue] = useState<Venue | null>(null)
  const [draft, setDraft] = useState<EditableFields | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setState({ kind: "loading" })
    try {
      const qs = new URLSearchParams()
      if (status === "all") qs.set("includeInactive", "true")
      const res = await fetch(`/api/passports/venues?${qs}`, { headers: getAuthHeaders() })
      if (res.status === 404) return setState({ kind: "not-ready" })
      if (res.status === 502) return setState({ kind: "error", message: "seeker недоступен" })
      if (res.status === 401 || res.status === 403) return setState({ kind: "error", message: "Нет доступа" })
      if (!res.ok) {
        const t = await res.text().catch(() => "")
        return setState({ kind: "error", message: `HTTP ${res.status}: ${t || res.statusText}` })
      }
      const json = await res.json()
      const venues: Venue[] = json?.data?.venues ?? json?.venues ?? []
      venues.sort((a, b) => {
        // Сначала по городу, потом по имени; внутри — с пустыми URL сверху
        // (админу видно куда допилить в первую очередь).
        const cityCmp = (a.cityName ?? a.citySlug).localeCompare(b.cityName ?? b.citySlug, "ru")
        if (cityCmp !== 0) return cityCmp
        const emptyA = !a.reviewGis || !a.reviewYandex ? 0 : 1
        const emptyB = !b.reviewGis || !b.reviewYandex ? 0 : 1
        if (emptyA !== emptyB) return emptyA - emptyB
        return a.name.localeCompare(b.name, "ru")
      })
      setState({ kind: "ok", venues })
    } catch (err: any) {
      setState({ kind: "error", message: String(err?.message ?? err) })
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const openEdit = (v: Venue) => {
    setEditVenue(v)
    setDraft({
      name: v.name,
      address: v.address,
      reviewGis: v.reviewGis,
      reviewYandex: v.reviewYandex,
      isActive: v.isActive,
    })
  }
  const closeEdit = () => {
    setEditVenue(null)
    setDraft(null)
  }

  const save = async () => {
    if (!editVenue || !draft) return
    // Собираем только реально изменившиеся поля.
    const patch: Partial<EditableFields> = {}
    if (draft.name !== editVenue.name) patch.name = draft.name
    if ((draft.address ?? null) !== (editVenue.address ?? null)) patch.address = draft.address ?? null
    if ((draft.reviewGis ?? null) !== (editVenue.reviewGis ?? null)) patch.reviewGis = draft.reviewGis ?? null
    if ((draft.reviewYandex ?? null) !== (editVenue.reviewYandex ?? null))
      patch.reviewYandex = draft.reviewYandex ?? null
    if (draft.isActive !== editVenue.isActive) patch.isActive = draft.isActive
    if (Object.keys(patch).length === 0) {
      closeEdit()
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/passports/venues/${editVenue.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (res.status === 422) {
        alert("Проверьте что URL в полях 2ГИС / Яндекс валидные (https://...)")
        return
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "")
        alert(`Не удалось сохранить: HTTP ${res.status}\n${t}`)
        return
      }
      closeEdit()
      await load()
    } finally {
      setSaving(false)
    }
  }

  const emptyCount =
    state.kind === "ok" ? state.venues.filter((v) => !v.reviewGis || !v.reviewYandex).length : 0

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Точки</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Пропишите здесь URL профилей 2ГИС и Яндекс.Карт — иначе кнопка «Оставить отзыв» родителям
            после игры не показывается.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={state.kind === "loading"} className="shrink-0">
          <RefreshCw className={`w-4 h-4 sm:mr-2 ${state.kind === "loading" ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Обновить</span>
        </Button>
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

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 text-muted-foreground p-6 border border-border rounded-lg bg-card">
          <Loader2 className="w-4 h-4 animate-spin" />
          Загрузка…
        </div>
      )}

      {state.kind === "not-ready" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">Endpoint /api/admin/venues ещё не построен на seeker.</div>
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
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <span>
              Всего: <span className="font-medium text-foreground">{state.venues.length}</span>
            </span>
            {emptyCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <AlertCircle size={12} />
                Без URL хотя бы одной площадки: <span className="font-semibold">{emptyCount}</span>
              </span>
            )}
          </div>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Город</th>
                    <th className="text-left px-4 py-2 font-medium">Название</th>
                    <th className="text-left px-4 py-2 font-medium">Адрес</th>
                    <th className="text-left px-4 py-2 font-medium">Отзывы</th>
                    <th className="text-left px-4 py-2 font-medium">Статус</th>
                    <th className="text-right px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {state.venues.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Точек ещё нет — появляются при первой игре с новым venue
                      </td>
                    </tr>
                  ) : (
                    state.venues.map((v) => (
                      <tr
                        key={v.id}
                        onClick={() => openEdit(v)}
                        className={`border-t border-border hover:bg-muted/40 cursor-pointer ${
                          !v.isActive ? "opacity-60" : ""
                        }`}
                      >
                        <td className="px-4 py-2 text-xs whitespace-nowrap">
                          <MapPin size={11} className="inline mr-1" />
                          {v.cityName ?? v.citySlug}
                        </td>
                        <td className="px-4 py-2 font-medium">{v.name}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{v.address || "—"}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-2">
                            <ReviewIcon url={v.reviewGis} label="2ГИС" />
                            <ReviewIcon url={v.reviewYandex} label="Яндекс" />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {v.isActive ? (
                            <span className="text-xs text-green-600">Активна</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Скрыта</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Pencil size={13} className="inline text-muted-foreground" />
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

      <Dialog open={!!editVenue} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Правка точки</DialogTitle>
          </DialogHeader>
          {editVenue && draft && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                <MapPin size={11} className="inline mr-1" />
                {editVenue.cityName ?? editVenue.citySlug}
                <span className="ml-2 font-mono opacity-70">{editVenue.id.slice(0, 8)}</span>
              </div>
              <div>
                <Label className="text-xs">Название *</Label>
                <Input
                  className="mt-1"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Адрес</Label>
                <Input
                  className="mt-1"
                  value={draft.address ?? ""}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value || null })}
                  placeholder="Барнаул, ТРЦ Европа, 3 этаж"
                />
              </div>
              <div>
                <Label className="text-xs">URL 2ГИС-профиля</Label>
                <Input
                  type="url"
                  className="mt-1"
                  value={draft.reviewGis ?? ""}
                  onChange={(e) => setDraft({ ...draft, reviewGis: e.target.value.trim() || null })}
                  placeholder="https://2gis.ru/barnaul/firm/..."
                />
              </div>
              <div>
                <Label className="text-xs">URL Яндекс.Карт-профиля</Label>
                <Input
                  type="url"
                  className="mt-1"
                  value={draft.reviewYandex ?? ""}
                  onChange={(e) => setDraft({ ...draft, reviewYandex: e.target.value.trim() || null })}
                  placeholder="https://yandex.ru/maps/-/..."
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="venue-active"
                  checked={draft.isActive}
                  onCheckedChange={(v) => setDraft({ ...draft, isActive: v === true })}
                />
                <Label htmlFor="venue-active" className="text-sm cursor-pointer">
                  Активна (родители видят её и на паспорте)
                </Label>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeEdit} disabled={saving} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button onClick={save} disabled={saving || !draft?.name?.trim()} className="w-full sm:w-auto">
              {saving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
