"use client"

import { useEffect, useState } from "react"
import { Calendar, Clock, MapPin, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Shift {
  id: string
  gameDate: string
  gameTime: string
  clientName: string
  playersCount: number
  totalAmount: string
  status: string
  gameDuration: number
  franchiseeName: string
  leadClientName?: string
  gameNotes?: string
}

export function DashboardEmployee() {
  const { user } = useAuth()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadShifts()
    }
  }, [user])

  const loadShifts = async () => {
    try {
      console.log("[v0] Loading shifts for employee")
      const response = await fetch(`/api/shifts?userId=${user?.id}`)

      if (!response.ok) {
        console.error("[v0] Failed to load shifts:", response.status)
        setShifts([])
        return
      }

      const data = await response.json()
      console.log("[v0] Shifts loaded:", data)
      setShifts(data.data || data)
    } catch (error) {
      console.error("[v0] Error loading shifts:", error)
      setShifts([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingShifts = shifts.filter((s) => {
    const gameDate = new Date(s.gameDate)
    return gameDate >= today && s.status === "scheduled"
  })

  const completedShifts = shifts.filter((s) => {
    const gameDate = new Date(s.gameDate)
    return gameDate < today && s.status === "scheduled"
  })

  const totalHours = shifts
    .filter((s) => {
      const gameDate = new Date(s.gameDate)
      return gameDate.getMonth() === now.getMonth() && gameDate.getFullYear() === now.getFullYear()
    })
    .reduce((acc, shift) => {
      return acc + (shift.gameDuration || 3)
    }, 0)

  const roleLabels: Record<string, string> = {
    animator: "Аниматор",
    host: "Ведущий",
    dj: "DJ",
    staff: "Персонал",
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Мои Смены</h2>
        <p className="text-sm text-muted-foreground mt-1">Расписание работы и выполненные смены</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-card border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{upcomingShifts.length}</p>
              <p className="text-xs text-muted-foreground">Предстоящие смены</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Clock className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedShifts.length}</p>
              <p className="text-xs text-muted-foreground">Выполнено смен</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{Math.round(totalHours)}</p>
              <p className="text-xs text-muted-foreground">Часов в этом месяце</p>
            </div>
          </div>
        </div>
      </div>

      {upcomingShifts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Предстоящие смены</h3>
          {upcomingShifts.map((shift) => {
            const gameDate = new Date(shift.gameDate)

            return (
              <div key={shift.id} className="rounded-lg bg-card border border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{shift.clientName || "Рабочая смена"}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin size={14} />
                      <span>{shift.franchiseeName || "Не указано"}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Игроков: {shift.playersCount || 0}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                    {roleLabels[user?.role || ""] || "Персонал"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>{gameDate.toLocaleDateString("ru-RU")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>
                      {shift.gameTime} ({shift.gameDuration || 3}ч)
                    </span>
                  </div>
                </div>
                {shift.gameNotes && <p className="mt-3 text-sm text-muted-foreground italic">{shift.gameNotes}</p>}
              </div>
            )
          })}
        </div>
      )}

      {completedShifts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Выполненные смены</h3>
          {completedShifts.slice(0, 5).map((shift) => {
            const gameDate = new Date(shift.gameDate)

            return (
              <div key={shift.id} className="rounded-lg bg-card border border-border p-6 opacity-60">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{shift.clientName || "Рабочая смена"}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin size={14} />
                      <span>{shift.franchiseeName || "Не указано"}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                    Завершено
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>{gameDate.toLocaleDateString("ru-RU")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>
                      {shift.gameTime} ({shift.gameDuration || 3}ч)
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {shifts.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">Смен пока нет</p>
        </div>
      )}
    </div>
  )
}
