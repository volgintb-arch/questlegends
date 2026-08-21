"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Sparkles,
  Store,
  Globe,
  MapPin,
  Copy,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// Управление подарками / скидками GiftOffer в seeker-passport.
// Бэкенд полностью на seeker'е, тут только UI поверх нашего прокси
// /api/passports/gift-offers.

type GiftOffer = {
  id: string
  citySlug: string | null
  partner: string
  title: string
  description: string | null
  promoCode: string | null
  ctaUrl: string | null
  imageUrl: string | null
  validFrom: string | null // YYYY-MM-DD
  validUntil: string | null
  isActive: boolean
  isSelfBrand: boolean
}

type OfferDraft = Omit<GiftOffer, "id">

const UK_ROLES = ["super_admin", "uk", "uk_employee"]

const emptyDraft: OfferDraft = {
  citySlug: null,
  partner: "",
  title: "",
  description: null,
  promoCode: null,
  ctaUrl: null,
  imageUrl: null,
  validFrom: null,
  validUntil: null,
  isActive: true,
  isSelfBrand: false,
}

function formatDate(v: string | null): string {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function isValidUrl(v: string | null | undefined): boolean {
  if (!v) return false
  try {
    new URL(v)
    return true
  } catch {
    return false
  }
}

function OfferPreview({ draft }: { draft: OfferDraft }) {
  const cityLabel =
    draft.citySlug === null
      ? "Все города"
      : draft.citySlug || "—"
  return (
    <div className="border border-border rounded-xl bg-card p-4 space-y-3 min-h-[280px]">
      <div className="text-[10px] uppercase text-muted-foreground font-medium">Так увидит родитель</div>
      <div className="rounded-lg overflow-hidden border border-border bg-background">
        {isValidUrl(draft.imageUrl) && (
          <div className="w-full h-32 bg-muted overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.imageUrl!} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase text-muted-foreground">
              {draft.isSelfBrand ? (
                <span className="inline-flex items-center gap-1">
                  <Sparkles size={10} className="text-orange-500" />
                  QuestLegends
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Store size={10} />
                  {draft.partner || "Партнёр"}
                </span>
              )}
            </div>
            {(draft.validFrom || draft.validUntil) && (
              <div className="text-[10px] text-muted-foreground">
                {draft.validFrom ? formatDate(draft.validFrom) : "…"} — {draft.validUntil ? formatDate(draft.validUntil) : "…"}
              </div>
            )}
          </div>
          <div className="font-semibold text-sm">{draft.title || "Заголовок карточки"}</div>
          {draft.description && (
            <div className="text-xs text-muted-foreground">{draft.description}</div>
          )}
          {draft.promoCode && (
            <div className="inline-block px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono">
              {draft.promoCode}
            </div>
          )}
          {isValidUrl(draft.ctaUrl) && (
            <button className="w-full mt-2 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded">
              Открыть
            </button>
          )}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
        {draft.citySlug === null ? <Globe size={10} /> : <MapPin size={10} />}
        {cityLabel}
        {!draft.isActive && <span className="ml-auto text-red-500">Скрыт</span>}
      </div>
    </div>
  )
}

function OfferDialog({
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
  onSave: (draft: OfferDraft, id?: string) => void
  initial: { id?: string; draft: OfferDraft }
  saving: boolean
  isUK: boolean
  userCitySlug: string | null
}) {
  const [draft, setDraft] = useState<OfferDraft>(initial.draft)

  useEffect(() => {
    setDraft(initial.draft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id, open])

  const canSave = draft.partner.trim().length > 0 && draft.title.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{initial.id ? "Редактирование" : "Новая акция"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 lg:gap-6">
          <div className="space-y-3 min-w-0">
            <div>
              <Label className="text-xs">Тип</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, isSelfBrand: true, partner: draft.partner || "QuestLegends" })}
                  className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                    draft.isSelfBrand
                      ? "border-orange-500 bg-orange-500/10 text-orange-600"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Sparkles className="inline w-3 h-3 mr-1" />
                  Наше промо
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, isSelfBrand: false })}
                  className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                    !draft.isSelfBrand
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Store className="inline w-3 h-3 mr-1" />
                  Партнёрская
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Город</Label>
              {isUK ? (
                <Input
                  className="mt-1"
                  value={draft.citySlug ?? ""}
                  placeholder="barnaul, omsk или пусто = все города"
                  onChange={(e) => setDraft({ ...draft, citySlug: e.target.value.trim() || null })}
                />
              ) : (
                <div className="mt-1 px-3 py-2 bg-muted text-sm rounded border border-border text-muted-foreground truncate">
                  {userCitySlug ?? "—"} (авто, ваш город)
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Партнёр *</Label>
              <Input
                className="mt-1"
                value={draft.partner}
                onChange={(e) => setDraft({ ...draft, partner: e.target.value })}
                placeholder={draft.isSelfBrand ? "QuestLegends" : "Роллы «Такаяма»"}
              />
            </div>
            <div>
              <Label className="text-xs">Заголовок *</Label>
              <Input
                className="mt-1"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Проведи ДР у нас — серебряное шоу в подарок"
              />
            </div>
            <div>
              <Label className="text-xs">Описание</Label>
              <Textarea
                className="mt-1"
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
                placeholder="Развёрнутое описание бонуса"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Промо-код</Label>
                <Input
                  className="mt-1 font-mono"
                  value={draft.promoCode ?? ""}
                  onChange={(e) => setDraft({ ...draft, promoCode: e.target.value || null })}
                  placeholder="SILVER2026"
                />
              </div>
              <div>
                <Label className="text-xs">CTA-ссылка</Label>
                <Input
                  className="mt-1"
                  value={draft.ctaUrl ?? ""}
                  onChange={(e) => setDraft({ ...draft, ctaUrl: e.target.value || null })}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Картинка (URL)</Label>
              <Input
                className="mt-1"
                value={draft.imageUrl ?? ""}
                onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value || null })}
                placeholder="https://storage.yandexcloud.net/…"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Действует с</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={draft.validFrom ?? ""}
                  onChange={(e) => setDraft({ ...draft, validFrom: e.target.value || null })}
                />
              </div>
              <div>
                <Label className="text-xs">по</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={draft.validUntil ?? ""}
                  onChange={(e) => setDraft({ ...draft, validUntil: e.target.value || null })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="active"
                checked={draft.isActive}
                onCheckedChange={(v) => setDraft({ ...draft, isActive: v === true })}
              />
              <Label htmlFor="active" className="text-sm cursor-pointer">
                Активна (родитель видит на паспорте)
              </Label>
            </div>
          </div>

          <div className="min-w-0">
            <OfferPreview draft={draft} />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
            Отмена
          </Button>
          <Button onClick={() => onSave(draft, initial.id)} disabled={!canSave || saving} className="w-full sm:w-auto">
            {saving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
            {initial.id ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PassportsGiftOffers() {
  const { user, getAuthHeaders } = useAuth()
  const isUK = user ? UK_ROLES.includes(user.role) : false
  const [offers, setOffers] = useState<GiftOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<"active" | "all">("active")
  const [type, setType] = useState<"all" | "self" | "partner">("all")
  const [dialog, setDialog] = useState<{ id?: string; draft: OfferDraft } | null>(null)
  const [saving, setSaving] = useState(false)
  const [userCitySlug, setUserCitySlug] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (status === "all") qs.set("includeInactive", "true")
      const res = await fetch(`/api/passports/gift-offers?${qs}`, { headers: getAuthHeaders() })
      if (res.status === 404) {
        setError("Endpoint /api/admin/gift-offers ещё не построен на seeker.")
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
      const list: GiftOffer[] = json?.data?.offers ?? json?.offers ?? []
      setOffers(list)
      // Извлекаем citySlug текущего юзера из первого city-scoped офера
      // (для UX формы; для UK останется null → freeform).
      if (!isUK) {
        const withCity = list.find((o) => o.citySlug)
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

  const filtered = useMemo(() => {
    return offers.filter((o) => {
      if (type === "self" && !o.isSelfBrand) return false
      if (type === "partner" && o.isSelfBrand) return false
      return true
    })
  }, [offers, type])

  const save = async (draft: OfferDraft, id?: string) => {
    setSaving(true)
    try {
      const url = id ? `/api/passports/gift-offers/${id}` : `/api/passports/gift-offers`
      const method = id ? "PATCH" : "POST"
      const body = { ...draft }
      // Для non-UK citySlug выставит сам seeker.
      if (!isUK) delete (body as any).citySlug
      const res = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
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

  const remove = async (offer: GiftOffer) => {
    if (!confirm(`Удалить акцию «${offer.title}»?`)) return
    const res = await fetch(`/api/passports/gift-offers/${offer.id}`, {
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

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Скидки и подарки</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Каталог GiftOffer на паспорте искателя. «Наши» — в блоке «Ваши бонусы», партнёрские — в «Скидки от друзей».
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="flex-1 sm:flex-initial">
            <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Обновить</span>
          </Button>
          <Button size="sm" onClick={() => setDialog({ draft: { ...emptyDraft, citySlug: isUK ? null : userCitySlug } })} className="flex-1 sm:flex-initial">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Добавить</span>
            <span className="sm:hidden">Новая</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
          {(["all", "self", "partner"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-2.5 sm:px-3 py-1.5 transition-colors ${
                type === t ? "bg-primary text-primary-foreground" : "bg-transparent hover:bg-muted"
              }`}
            >
              {t === "all" ? "Все" : t === "self" ? "Наши" : "Партнёрские"}
            </button>
          ))}
        </div>
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
                    <th className="text-left px-4 py-2 font-medium">Тип</th>
                    <th className="text-left px-4 py-2 font-medium">Партнёр</th>
                    <th className="text-left px-4 py-2 font-medium">Заголовок</th>
                    <th className="text-left px-4 py-2 font-medium">Город</th>
                    <th className="text-left px-4 py-2 font-medium">Код</th>
                    <th className="text-left px-4 py-2 font-medium">Действует</th>
                    <th className="text-left px-4 py-2 font-medium">Статус</th>
                    <th className="text-right px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        Ничего нет — добавьте первую акцию
                      </td>
                    </tr>
                  ) : (
                    filtered.map((o) => (
                      <tr key={o.id} className={`border-t border-border hover:bg-muted/40 ${!o.isActive ? "opacity-60" : ""}`}>
                        <td className="px-4 py-2">
                          {o.isSelfBrand ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-500/10 text-orange-600 border border-orange-500/20">
                              <Sparkles size={10} />
                              Наши
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              <Store size={10} />
                              Партнёр
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">{o.partner}</td>
                        <td className="px-4 py-2 max-w-[280px] truncate" title={o.title}>{o.title}</td>
                        <td className="px-4 py-2">
                          {o.citySlug === null ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Globe size={11} />
                              Все города
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <MapPin size={11} />
                              {o.citySlug}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {o.promoCode ? (
                            <div className="inline-flex items-center gap-1">
                              <span className="font-mono text-xs">{o.promoCode}</span>
                              <button
                                onClick={() => void navigator.clipboard.writeText(o.promoCode!)}
                                className="text-muted-foreground hover:text-foreground"
                                title="Скопировать"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {o.validFrom || o.validUntil ? (
                            <>
                              {formatDate(o.validFrom)} — {formatDate(o.validUntil)}
                            </>
                          ) : (
                            <span className="text-muted-foreground">бессрочно</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {o.isActive ? (
                            <span className="text-xs text-green-600">Активна</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Скрыта</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          {o.ctaUrl && (
                            <a
                              href={o.ctaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-primary inline-block mr-2"
                              title="Открыть CTA"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          <button
                            onClick={() => setDialog({ id: o.id, draft: { ...o } })}
                            className="text-muted-foreground hover:text-foreground mr-2"
                            title="Редактировать"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => remove(o)}
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
        <OfferDialog
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
