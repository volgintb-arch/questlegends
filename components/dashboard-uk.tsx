"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DollarSign, TrendingUp, Users, BarChart3 } from "lucide-react"
import { MetricCard } from "./metric-card"

interface FranchiseData {
  id: string
  name: string
  location: string
  revenue: number
  royalties: number
  expenses: number
  profit: number
}

export function DashboardUK() {
  const { user, getAuthHeaders } = useAuth()
  const [franchises, setFranchises] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalRoyalties: 0,
    averageCheck: 0,
    totalGames: 0,
  })
  const [kpiData] = useState([
    {
      id: "1",
      name: "Общая Выручка Сети",
      value: "0K ₽",
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      id: "2",
      name: "Сводное Роялти (7%)",
      value: "0K ₽",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: "3",
      name: "Средний Чек",
      value: "0K ₽",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: "4",
      name: "Количество Игр",
      value: "0",
      icon: <Users className="w-5 h-5" />,
    },
  ])

  const isUkEmployee = user?.role === "uk_employee"

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = getAuthHeaders()
        const [franchisesRes, transactionsRes, gamesRes] = await Promise.all([
          fetch("/api/franchisees", { headers, cache: "no-store" }),
          fetch("/api/transactions?limit=1000", { headers, cache: "no-store" }),
          fetch("/api/game-leads?status=completed", { headers, cache: "no-store" }),
        ])

        let franchisesData: any[] = []
        let transactionsData: any[] = []
        let gamesData: any[] = []

        if (franchisesRes.ok) {
          const data = await franchisesRes.json()
          franchisesData = Array.isArray(data) ? data : data.data || []
          setFranchises(franchisesData)
        } else {
          console.error("Failed to load franchises:", franchisesRes.status)
        }

        if (transactionsRes.ok) {
          const data = await transactionsRes.json()
          transactionsData = Array.isArray(data) ? data : data.data || []
          setTransactions(transactionsData)
        }

        if (gamesRes.ok) {
          const data = await gamesRes.json()
          gamesData = Array.isArray(data) ? data : data.data || []
        }

        const revenue = transactionsData
          .filter((t) => t.type === "income" || t.type === "revenue")
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

        const royalties = franchisesData.reduce((sum, f) => {
          const franchiseeRevenue = transactionsData
            .filter((t) => t.franchiseeId === f.id && (t.type === "income" || t.type === "revenue"))
            .reduce((s, t) => s + (Number(t.amount) || 0), 0)
          const royaltyPercent = Number(f.royaltyPercent) || 7.0
          return sum + (franchiseeRevenue * royaltyPercent) / 100
        }, 0)

        const games = gamesData.length || transactionsData.filter((t) => t.gameLeadId).length
        const avgCheck = games > 0 ? revenue / games : 0

        setMetrics({
          totalRevenue: revenue,
          totalRoyalties: royalties,
          averageCheck: avgCheck,
          totalGames: games,
        })
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [getAuthHeaders, user?.role, isUkEmployee])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка данных...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">
          {isUkEmployee ? "Ключевые Показатели ваших франчизи" : "Ключевые Показатели"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {kpiData.map((metric) => (
            <MetricCard
              key={metric.id}
              title={metric.name}
              value={
                metric.id === "1"
                  ? `${(metrics.totalRevenue / 1000).toFixed(0)}K ₽`
                  : metric.id === "2"
                    ? `${(metrics.totalRoyalties / 1000).toFixed(0)}K ₽`
                    : metric.id === "3"
                      ? `${(metrics.averageCheck / 1000).toFixed(0)}K ₽`
                      : metric.id === "4"
                        ? `${metrics.totalGames}`
                        : metric.value
              }
              trend={{ value: 0, isPositive: true }}
              icon={metric.icon}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            {isUkEmployee ? "Делегированные франчизи" : "Франчайзи сети"}
          </h2>
          <span className="text-xs text-muted-foreground">{franchises.length} франшиз</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-10 gap-2">
          {franchises.map((franchise) => {
            const franchiseeRevenue = transactions
              .filter((t) => t.franchiseeId === franchise.id && (t.type === "income" || t.type === "revenue"))
              .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

            return (
              <div key={franchise.id} className="bg-card border border-border rounded-lg p-2.5">
                <div className="space-y-1">
                  <h3 className="font-medium text-foreground text-xs truncate">{franchise.name}</h3>
                  <p className="text-[10px] text-muted-foreground truncate">{franchise.city}</p>
                  <p className="text-xs font-semibold text-primary">{(franchiseeRevenue / 1000).toFixed(0)}K ₽</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg bg-card border border-border p-4 sm:p-6">
        <h3 className="text-sm sm:text-base font-semibold text-foreground mb-4">
          Топ 10 Финансовых Показателей по Франчизи/Собственным Точкам
        </h3>
        {franchises.length > 0 ? (
          <div className="space-y-2">
            {franchises
              .map((f) => ({
                ...f,
                revenue: transactions
                  .filter((t) => t.franchiseeId === f.id && (t.type === "income" || t.type === "revenue"))
                  .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
              }))
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 10)
              .map((franchise, index) => (
                <div
                  key={franchise.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">{index + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{franchise.name}</p>
                      <p className="text-xs text-muted-foreground">{franchise.city}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{franchise.revenue.toLocaleString("ru-RU")} ₽</p>
                    <p className="text-xs text-muted-foreground">
                      Роялти:{" "}
                      {((franchise.revenue * (Number(franchise.royaltyPercent) || 7)) / 100).toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {loading ? "Загрузка данных..." : "Нет данных для отображения"}
          </div>
        )}
      </div>
    </div>
  )
}
