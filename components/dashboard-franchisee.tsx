"use client"
import {
  DollarSign,
  Percent,
  Calendar,
  TrendingUp,
  Gamepad2,
  CreditCard,
  CalendarDays,
  CheckCircle2,
  Bell,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GameLead {
  id: string
  clientName: string
  gameDate: string
  gameTime: string
  playersCount: number
  totalAmount: number
  prepayment: number
  animatorsCount: number
  hostsCount: number
  djsCount: number
  stageType: string
  stageName: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  relatedDealId?: string
  relatedTaskId?: string
}

interface DashboardStats {
  totalRevenue: number
  totalGames: number
  completedGames: number
  upcomingGames: number
  totalFot: number
  royaltyPercent: number
  royaltyAmount: number
  profit: number
  unreadNotifications: number
}

export function DashboardFranchisee() {
  const { user, getAuthHeaders, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalGames: 0,
    completedGames: 0,
    upcomingGames: 0,
    totalFot: 0,
    royaltyPercent: 7,
    royaltyAmount: 0,
    profit: 0,
    unreadNotifications: 0,
  })
  const [upcomingGames, setUpcomingGames] = useState<GameLead[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchDashboardData = useCallback(async () => {
    if (!user?.franchiseeId) {
      setLoading(false)
      return
    }

    const headers = getAuthHeaders()
    console.log("[v0] Dashboard: Fetching data for franchisee:", user.franchiseeId)

    try {
      const results = await Promise.allSettled([
        fetch(`/api/transactions?franchiseeId=${user.franchiseeId}`, { headers }),
        fetch(`/api/franchisees/${user.franchiseeId}`, { headers }),
        fetch(`/api/game-leads?franchiseeId=${user.franchiseeId}`, { headers }),
        fetch(`/api/notifications`, { headers }),
      ])

      const transactionsRes = results[0]
      let transactions: any[] = []
      if (transactionsRes.status === "fulfilled" && transactionsRes.value.ok) {
        const transData = await transactionsRes.value.json()
        transactions = transData.transactions || transData.data || []
      }

      const franchiseeData =
        results[1].status === "fulfilled" && results[1].value.ok ? await results[1].value.json() : null

      const leadsRes = results[2]
      let leads: GameLead[] = []
      if (leadsRes.status === "fulfilled" && leadsRes.value.ok) {
        const leadsData = await leadsRes.value.json()
        leads = leadsData.data || []
      }

      const notificationsRes = results[3]
      let notificationsList: Notification[] = []
      if (notificationsRes.status === "fulfilled" && notificationsRes.value.ok) {
        const notificationsData = await notificationsRes.value.json()
        notificationsList = notificationsData?.data?.notifications || []
      }

      const royaltyPercent = franchiseeData?.data?.royaltyPercent ?? franchiseeData?.royaltyPercent ?? 7

      const revenue = transactions
        .filter((t: any) => t.type === "income")
        .reduce((sum: number, t: any) => sum + (Number.parseFloat(t.amount) || 0), 0)

      const fot = transactions
        .filter((t: any) => t.category?.startsWith("fot"))
        .reduce((sum: number, t: any) => sum + (Number.parseFloat(t.amount) || 0), 0)

      const royaltyAmount = revenue * (royaltyPercent / 100)
      const profit = revenue - fot - royaltyAmount

      const completedGames = leads.filter(
        (l) => l.stageType === "completed" || l.stageName?.toLowerCase().includes("завершен"),
      ).length

      const today = new Date().toISOString().split("T")[0]
      const upcoming = leads.filter(
        (l) =>
          l.gameDate &&
          l.gameDate >= today &&
          l.stageType !== "completed" &&
          !l.stageName?.toLowerCase().includes("завершен"),
      )

      const sortedNotifications = Array.isArray(notificationsList)
        ? notificationsList.sort((a, b) => {
            if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })
        : []

      setStats({
        totalRevenue: revenue,
        totalGames: leads.length,
        completedGames,
        upcomingGames: upcoming.length,
        totalFot: fot,
        royaltyPercent,
        royaltyAmount,
        profit,
        unreadNotifications: sortedNotifications.filter((n: Notification) => !n.isRead).length,
      })

      setUpcomingGames(upcoming.slice(0, 5))
      setNotifications(sortedNotifications.slice(0, 5))
    } catch (error) {
      console.error("[v0] Dashboard: Error fetching data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.franchiseeId, getAuthHeaders])

  useEffect(() => {
    if (authLoading) return
    fetchDashboardData()
  }, [authLoading, fetchDashboardData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  const handleNotificationClick = async (notification: Notification) => {
    console.log("[v0] Dashboard: Notification clicked:", notification.id, notification.relatedDealId)

    if (notification.relatedDealId) {
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ isRead: true }),
        })
        console.log("[v0] Dashboard: Notification marked as read")
      } catch (e) {
        console.error("[v0] Dashboard: Error marking notification as read:", e)
      }

      const taskParam = notification.relatedTaskId ? `&taskId=${notification.relatedTaskId}` : ""
      const url = `/crm?dealId=${notification.relatedDealId}${taskParam}`
      console.log("[v0] Dashboard: Navigating to:", url)
      router.push(url)
    } else {
      console.log("[v0] Dashboard: No relatedDealId in notification")
    }
  }

  const isOwnPoint = user?.role === "own_point"

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Дашборд</h1>
          <p className="text-muted-foreground">
            Обзор ключевых показателей
            {isOwnPoint && <span className="ml-2 text-blue-500">(Собственная точка)</span>}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Main Stats */}
      <div className={cn("grid gap-4 md:grid-cols-2", isOwnPoint ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Доход</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalRevenue.toLocaleString("ru-RU")} ₽</div>
            <p className="text-xs text-muted-foreground">За текущий месяц</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", stats.profit >= 0 ? "text-blue-600" : "text-red-600")}>
              {isOwnPoint
                ? (stats.totalRevenue - stats.totalFot).toLocaleString("ru-RU")
                : stats.profit.toLocaleString("ru-RU")}{" "}
              ₽
            </div>
            <p className="text-xs text-muted-foreground">
              {isOwnPoint ? "После вычета ФОТ" : "После вычета ФОТ и роялти"}
            </p>
          </CardContent>
        </Card>

        {!isOwnPoint && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Роялти ({stats.royaltyPercent}%)</CardTitle>
              <Percent className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.royaltyAmount.toLocaleString("ru-RU")} ₽</div>
              <p className="text-xs text-muted-foreground">К оплате УК</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ФОТ</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalFot.toLocaleString("ru-RU")} ₽</div>
            <p className="text-xs text-muted-foreground">Расходы на персонал</p>
          </CardContent>
        </Card>
      </div>

      {/* Games Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего игр</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGames}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Завершено</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedGames}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Предстоящие</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcomingGames}</div>
          </CardContent>
        </Card>
      </div>

      {/* Two columns: Upcoming Games and Notifications */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming Games */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Ближайшие игры
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingGames.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет предстоящих игр</p>
            ) : (
              <div className="space-y-3">
                {upcomingGames.map((game) => (
                  <div key={game.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{game.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {game.gameDate} {game.gameTime && `в ${game.gameTime}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{(game.totalAmount || 0).toLocaleString("ru-RU")} ₽</p>
                      <p className="text-sm text-muted-foreground">{game.playersCount || 0} чел.</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Уведомления
              {stats.unreadNotifications > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.unreadNotifications}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет новых уведомлений</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted",
                      notification.isRead ? "bg-muted/30" : "bg-muted/50 border-l-2 border-primary",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                      </div>
                      {notification.relatedDealId && (
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                      )}
                    </div>
                    {notification.type === "task" && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Задача
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
