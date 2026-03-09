"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { RussianRuble, TrendingUp, Users, BarChart3 } from "lucide-react"
import { MetricCard } from "./metric-card"

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

  const formatMoney = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₽`
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K ₽`
    return `${Math.round(value)} ₽`
  }

  const kpiData = [
    {
      id: "1",
      name: "Общая Выручка Сети",
      value: formatMoney(metrics.totalRevenue),
      icon: <RussianRuble className="w-5 h-5" />,
    },
    {
      id: "2",
      name: "Сводное Роялти",
      value: formatMoney(metrics.totalRoyalties),
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: "3",
      name: "Средний Чек",
      value: formatMoney(metrics.averageCheck),
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: "4",
      name: "Количество Игр",
      value: `${metrics.totalGames}`,
      icon: <Users className="w-5 h-5" />,
    },
  ]

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
          const royaltyPercent = Number(f.royaltyPercent) || 0
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

  // Обогащённые данные по каждому франчайзи (только базовые 4 метрики)
  const enrichedFranchises = useMemo(() => {
    return franchises.map((f) => {
      const revenue = transactions
        .filter((t) => t.franchiseeId === f.id && (t.type === "income" || t.type === "revenue"))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
      const royaltyPercent = Number(f.royaltyPercent) || 0
      const royalty = Math.round((revenue * royaltyPercent) / 100)
      const expenses = Number(f.totalExpenses) || 0
      const profit = revenue - expenses - royalty
      return { ...f, revenue, royalty, expenses, profit }
    })
  }, [franchises, transactions])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка данных...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* KPI блок */}
      <div className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">
          {isUkEmployee ? "Ключевые Показатели ваших франчизи" : "Ключевые Показатели"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {kpiData.map((metric) => (
            <MetricCard
              key={metric.id}
              title={metric.name}
              value={metric.value}
              trend={{ value: 0, isPositive: true }}
              icon={metric.icon}
            />
          ))}
        </div>
      </div>

      {/* Карточки франчайзи с базовыми метриками */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            {isUkEmployee ? "Делегированные франчизи" : "Франчайзи сети"}
          </h2>
          <span className="text-xs text-muted-foreground">{franchises.length} франшиз</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {enrichedFranchises.length > 0 ? (
            enrichedFranchises.map((f) => (
              <div
                key={f.id}
                className="rounded-lg bg-card border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="mb-3">
                  <p className="font-medium text-foreground text-sm truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.city}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Выручка</p>
                    <p className="text-sm font-medium text-foreground">{formatMoney(f.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Расходы</p>
                    <p className="text-sm font-medium text-muted-foreground">{formatMoney(f.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Роялти</p>
                    <p className="text-sm font-medium text-muted-foreground">{formatMoney(f.royalty)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Прибыль</p>
                    <p className={`text-sm font-semibold ${f.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatMoney(f.profit)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
              Нет данных для отображения
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
