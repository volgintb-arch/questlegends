"use client"

import { useState } from "react"
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ticket,
  User as UserIcon,
  Calendar,
  Phone,
  IdCard,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

type BonusState = "GRANTED" | "USED" | "EXPIRED"

type Bonus = {
  id: string
  title: string
  description: string | null
  state: BonusState
  redemptionCode: string
  expiresAt: string | null
  usedAt: string | null
  usedByAdminId: string | null
  usedByAdminName?: string | null
  usedNote: string | null
  parent: {
    id: string
    phone: string | null
  } | null
  passport: {
    id: string
    displayNumber: string
    childName: string
    childBirthdate: string | null
    citySlug: string
    cityName: string | null
  } | null
}

type FetchState =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "found"; bonus: Bonus }
  | { kind: "empty" }
  | { kind: "error"; message: string }

// Родитель диктует код на площадке. UI очищает от пробелов, приводит
// в верхний регистр, но валидацию оставляет бэку — контракт нормализует.
function normalizeCode(v: string): string {
  return v.toUpperCase().replace(/\s+/g, "")
}

function formatDate(v: string | null | undefined): string {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

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

function StateBadge({ state }: { state: BonusState }) {
  if (state === "GRANTED")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-600 border border-green-500/20">
        <CheckCircle2 size={11} />
        Готов к погашению
      </span>
    )
  if (state === "USED")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground border border-border">
        <XCircle size={11} />
        Использован
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-600 border border-red-500/20">
      <AlertCircle size={11} />
      Просрочен
    </span>
  )
}

export function PassportsBonusRedeem() {
  const { getAuthHeaders } = useAuth()
  const [rawInput, setRawInput] = useState("")
  const [state, setState] = useState<FetchState>({ kind: "idle" })
  const [redeemDialog, setRedeemDialog] = useState(false)
  const [note, setNote] = useState("")
  const [redeeming, setRedeeming] = useState(false)

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const code = normalizeCode(rawInput)
    if (!code) return
    setState({ kind: "searching" })
    try {
      const res = await fetch(`/api/passports/bonuses?code=${encodeURIComponent(code)}`, {
        headers: getAuthHeaders(),
      })
      if (res.status === 404) {
        setState({ kind: "error", message: "Endpoint /api/admin/bonuses ещё не построен на seeker (M5)." })
        return
      }
      if (res.status === 502) {
        setState({ kind: "error", message: "seeker-passport недоступен." })
        return
      }
      if (res.status === 401 || res.status === 403) {
        setState({ kind: "error", message: "Нет доступа." })
        return
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "")
        setState({ kind: "error", message: `HTTP ${res.status}: ${t || res.statusText}` })
        return
      }
      const json = await res.json()
      const bonuses: Bonus[] = json?.data?.bonuses ?? json?.bonuses ?? []
      if (bonuses.length === 0) {
        setState({ kind: "empty" })
        return
      }
      setState({ kind: "found", bonus: bonuses[0] })
    } catch (err: any) {
      setState({ kind: "error", message: String(err?.message ?? err) })
    }
  }

  const openRedeem = () => {
    setNote("")
    setRedeemDialog(true)
  }

  const doRedeem = async () => {
    if (state.kind !== "found") return
    setRedeeming(true)
    try {
      const res = await fetch(`/api/passports/bonuses/${state.bonus.id}/redeem`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || null }),
      })
      if (res.status === 409) {
        const t = await res.text().catch(() => "")
        alert(`Не удалось погасить: ${t || "срок вышел или бонус уже использован"}`)
        return
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "")
        alert(`Не удалось погасить: HTTP ${res.status}\n${t}`)
        return
      }
      setRedeemDialog(false)
      // Перезагрузим, чтобы карточка обновилась (state=USED, usedAt, usedNote)
      await search()
    } finally {
      setRedeeming(false)
    }
  }

  const clear = () => {
    setRawInput("")
    setState({ kind: "idle" })
  }

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Погашение бонусов</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Родитель называет код бонуса — введите его, проверьте паспорт и погасите.
        </p>
      </div>

      <form onSubmit={search} className="flex flex-col sm:flex-row gap-2 max-w-lg">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="A3M9-K7XB"
            className="pl-9 font-mono tracking-wider uppercase"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={state.kind === "searching" || !rawInput.trim()} className="w-full sm:w-auto">
          {state.kind === "searching" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Поиск…
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Найти
            </>
          )}
        </Button>
        {(state.kind === "found" || state.kind === "empty" || state.kind === "error") && (
          <Button type="button" variant="outline" onClick={clear} className="w-full sm:w-auto">
            Сбросить
          </Button>
        )}
      </form>

      {state.kind === "empty" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card max-w-lg">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Код не найден</div>
            <p className="text-muted-foreground mt-1">
              Проверьте что родитель продиктовал верно (могут путаться `O`↔`0`, `I`↔`1`).
            </p>
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="flex items-start gap-3 p-6 border border-border rounded-lg bg-card max-w-lg">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Ошибка</div>
            <p className="text-muted-foreground mt-1 break-all">{state.message}</p>
          </div>
        </div>
      )}

      {state.kind === "found" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden max-w-2xl">
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs uppercase text-muted-foreground">Бонус</div>
                <div className="text-lg font-semibold mt-1">{state.bonus.title}</div>
                {state.bonus.description && (
                  <p className="text-sm text-muted-foreground mt-1">{state.bonus.description}</p>
                )}
              </div>
              <StateBadge state={state.bonus.state} />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div>
                <div className="text-xs text-muted-foreground">Код</div>
                <div className="font-mono font-semibold tracking-wider mt-0.5">{state.bonus.redemptionCode}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar size={11} />
                  Годен до
                </div>
                <div className="text-sm mt-0.5">{formatDate(state.bonus.expiresAt)}</div>
              </div>
            </div>

            {state.bonus.passport && (
              <div className="border-t border-border pt-3 space-y-1">
                <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                  <IdCard size={11} />
                  Паспорт
                </div>
                <div className="font-mono text-sm">{state.bonus.passport.displayNumber}</div>
                <div className="text-sm">
                  <UserIcon size={12} className="inline mr-1" />
                  {state.bonus.passport.childName}
                  {state.bonus.passport.childBirthdate && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ДР {formatDate(state.bonus.passport.childBirthdate)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {state.bonus.passport.cityName ?? state.bonus.passport.citySlug}
                </div>
              </div>
            )}

            {state.bonus.parent?.phone && (
              <div className="border-t border-border pt-3">
                <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                  <Phone size={11} />
                  Родитель
                </div>
                <a href={`tel:${state.bonus.parent.phone}`} className="text-sm hover:text-primary">
                  {state.bonus.parent.phone}
                </a>
              </div>
            )}

            {state.bonus.state === "USED" && (
              <div className="border-t border-border pt-3 space-y-1 bg-muted/30 -mx-4 sm:-mx-5 px-4 sm:px-5 py-3">
                <div className="text-xs uppercase text-muted-foreground">Использован</div>
                <div className="text-sm">
                  {formatDateTime(state.bonus.usedAt)}
                  {state.bonus.usedByAdminName && (
                    <span className="text-muted-foreground"> · {state.bonus.usedByAdminName}</span>
                  )}
                </div>
                {state.bonus.usedNote && (
                  <div className="text-sm text-muted-foreground italic">«{state.bonus.usedNote}»</div>
                )}
              </div>
            )}
          </div>

          {state.bonus.state === "GRANTED" && (
            <div className="border-t border-border p-4 sm:p-5 bg-muted/20">
              <Button onClick={openRedeem} className="w-full sm:w-auto">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Погасить бонус
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={redeemDialog} onOpenChange={setRedeemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Погасить бонус</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              {state.kind === "found" && (
                <>
                  <div className="font-semibold">{state.bonus.title}</div>
                  {state.bonus.passport && (
                    <div className="text-muted-foreground text-xs mt-1">
                      {state.bonus.passport.displayNumber} · {state.bonus.passport.childName}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <Label className="text-xs">Заметка (не обязательно)</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Использовано на день рождения 22 июля"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Сохраняется в логе. Полезно для аудита.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRedeemDialog(false)} disabled={redeeming} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button onClick={doRedeem} disabled={redeeming} className="w-full sm:w-auto">
              {redeeming && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              Подтвердить погашение
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
