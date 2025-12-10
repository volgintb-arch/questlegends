"use client"

import { Calendar, BookOpen } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export function DashboardPersonnel() {
  const { user } = useAuth()
  const router = useRouter()
  const [upcomingGames, setUpcomingGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUpcomingGames()
  }, [user?.id])

  const loadUpcomingGames = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/game-schedule?personnelId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        const games = data.data || data || []
        // Filter upcoming games only
        const upcoming = games
          .filter((g: any) => new Date(g.gameDate) >= new Date())
          .sort((a: any, b: any) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime())
          .slice(0, 5)
        setUpcomingGames(upcoming)
      }
    } catch (error) {
      console.error("[v0] Error loading games:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = () => {
    const roleLabels: Record<string, string> = {
      animator: "Аниматор",
      host: "Ведущий",
      dj: "DJ",
    }
    return roleLabels[user?.role || ""] || "Сотрудник"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка данных...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Мой Кабинет</h1>
        <p className="text-muted-foreground">
          {getRoleLabel()}: {user?.name}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => router.push("/personnel")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg p-6 flex items-center justify-center gap-3 text-lg font-semibold transition-colors"
        >
          <Calendar size={24} />
          Мой График
        </button>
        <button
          onClick={() => router.push("/knowledge")}
          className="bg-success hover:bg-success/90 text-white rounded-lg p-6 flex items-center justify-center gap-3 text-lg font-semibold transition-colors"
        >
          <BookOpen size={24} />
          База Знаний
        </button>
      </div>

      {/* Upcoming Games Widget */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Ближайшие Игры</h3>
          <span className="ml-auto bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">
            {upcomingGames.length}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Ваши назначения на игры</p>

        {upcomingGames.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">На данный момент игр не назначено</div>
        ) : (
          <div className="space-y-2">
            {upcomingGames.map((game) => (
              <div key={game.id} className="bg-muted border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{game.clientName || "Без названия"}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {game.gameDate
                        ? new Date(game.gameDate).toLocaleDateString("ru-RU", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })
                        : "Дата не указана"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Время: {game.gameTime || "Не указано"}, Длительность: {game.gameDuration || 3}ч
                    </p>
                  </div>
                  <span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-medium">
                    {user?.role === "animator" ? "Аниматор" : user?.role === "host" ? "Ведущий" : "DJ"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
