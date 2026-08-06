"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Download, RefreshCw, Users } from "lucide-react"

type Guest = {
  id: string
  phone: string
  childName: string
  childBirthdate: string | null
  email: string | null
  tgUserId: string | null
  passportNumber: string | null
  source: string
  citySlug: string | null
  franchiseeName: string | null
  attendancesCount: number
  createdAt: string
  daysUntilBirthday: number | null
}

type FranchiseeLite = { id: string; name: string; city?: string | null; citySlug?: string | null }

export function MarketingGuests() {
  const { user, getAuthHeaders } = useAuth()
  const isUK = user?.role === "uk" || user?.role === "super_admin" || user?.role === "uk_employee"

  const [guests, setGuests] = useState<Guest[]>([])
  const [franchisees, setFranchisees] = useState<FranchiseeLite[]>([])
  const [loading, setLoading] = useState(true)

  const [citySlug, setCitySlug] = useState<string>("all")
  const [daysMax, setDaysMax] = useState<string>("")
  const [hasEmail, setHasEmail] = useState(false)
  const [hasTg, setHasTg] = useState(false)

  const buildQuery = (extra?: Record<string, string>) => {
    const p = new URLSearchParams()
    if (isUK && citySlug && citySlug !== "all") p.set("citySlug", citySlug)
    if (daysMax) p.set("daysMax", daysMax)
    if (hasEmail) p.set("hasEmail", "1")
    if (hasTg) p.set("hasTg", "1")
    if (extra) for (const [k, v] of Object.entries(extra)) p.set(k, v)
    return p.toString()
  }

  const load = async () => {
    setLoading(true)
    try {
      const qs = buildQuery()
      const res = await fetch(`/api/marketing/guests${qs ? "?" + qs : ""}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setGuests(data.guests || [])
      } else {
        setGuests([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    // Список франчайзи нужен только UK-ролям для селекта городов.
    if (isUK) {
      fetch("/api/franchisees", { headers: getAuthHeaders() })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((data) => setFranchisees(data.data || data.franchisees || []))
        .catch(() => {})
    }
  }, [user, isUK])

  useEffect(() => {
    if (!user) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, citySlug, daysMax, hasEmail, hasTg])

  const citySlugOptions = useMemo(() => {
    const set = new Set<string>()
    for (const f of franchisees) {
      if (f.citySlug) set.add(f.citySlug)
    }
    return Array.from(set).sort()
  }, [franchisees])

  const exportHref = `/api/marketing/guests?${buildQuery({ format: "csv" })}`

  const badgeForDays = (d: number | null) => {
    if (d == null) return null
    if (d <= 14) return "text-red-500 bg-red-500/10 border-red-500/20"
    if (d <= 45) return "text-orange-500 bg-orange-500/10 border-orange-500/20"
    if (d <= 60) return "text-amber-500 bg-amber-500/10 border-amber-500/20"
    return "text-muted-foreground bg-muted/40 border-border"
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Гости</h2>
          <span className="text-xs text-muted-foreground">
            {loading ? "…" : `${guests.length} записей`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted/60"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </button>
          <a
            href={exportHref}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-primary text-white hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg border border-border bg-card">
        {isUK && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Город</label>
            <select
              value={citySlug}
              onChange={(e) => setCitySlug(e.target.value)}
              className="w-full h-9 px-2 text-sm rounded-md border border-border bg-background"
            >
              <option value="all">Все города</option>
              {citySlugOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">До ДР ≤ (дней)</label>
          <input
            type="number"
            min="0"
            value={daysMax}
            onChange={(e) => setDaysMax(e.target.value)}
            placeholder="без ограничений"
            className="w-full h-9 px-2 text-sm rounded-md border border-border bg-background"
          />
        </div>
        <label className="flex items-center gap-2 text-sm mt-5">
          <input
            type="checkbox"
            checked={hasEmail}
            onChange={(e) => setHasEmail(e.target.checked)}
            className="h-4 w-4"
          />
          Только с email
        </label>
        <label className="flex items-center gap-2 text-sm mt-5">
          <input
            type="checkbox"
            checked={hasTg}
            onChange={(e) => setHasTg(e.target.checked)}
            className="h-4 w-4"
          />
          Только с Telegram
        </label>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Телефон</th>
                <th className="text-left px-3 py-2 font-medium">Ребёнок</th>
                <th className="text-left px-3 py-2 font-medium">ДР</th>
                <th className="text-left px-3 py-2 font-medium">До ДР</th>
                <th className="text-left px-3 py-2 font-medium">Email</th>
                <th className="text-left px-3 py-2 font-medium">TG</th>
                <th className="text-right px-3 py-2 font-medium">Визитов</th>
                <th className="text-left px-3 py-2 font-medium">Источник</th>
                {isUK && <th className="text-left px-3 py-2 font-medium">Город</th>}
                <th className="text-left px-3 py-2 font-medium">Паспорт</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isUK ? 10 : 9} className="px-3 py-6 text-center text-muted-foreground">
                    Загрузка…
                  </td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan={isUK ? 10 : 9} className="px-3 py-6 text-center text-muted-foreground">
                    Гостей не найдено. Как только seeker-passport начнёт слать активации — они появятся здесь.
                  </td>
                </tr>
              ) : (
                guests.map((g) => (
                  <tr key={g.id} className="border-t border-border hover:bg-muted/40">
                    <td className="px-3 py-2 whitespace-nowrap">{g.phone}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{g.childName}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {g.childBirthdate ? new Date(g.childBirthdate).toLocaleDateString("ru-RU") : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {g.daysUntilBirthday != null ? (
                        <span
                          className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${badgeForDays(
                            g.daysUntilBirthday,
                          )}`}
                        >
                          {g.daysUntilBirthday === 0 ? "сегодня" : `${g.daysUntilBirthday} дн.`}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">{g.email || "—"}</td>
                    <td className="px-3 py-2 text-xs">{g.tgUserId || "—"}</td>
                    <td className="px-3 py-2 text-right">{g.attendancesCount}</td>
                    <td className="px-3 py-2 text-xs">{g.source}</td>
                    {isUK && <td className="px-3 py-2 text-xs">{g.citySlug || g.franchiseeName || "—"}</td>}
                    <td className="px-3 py-2 text-xs">{g.passportNumber || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
