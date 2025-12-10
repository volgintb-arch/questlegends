"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import type React from "react"
import { DollarSign, TrendingUp, Users, Settings, BarChart3, Target } from "lucide-react"
import { MetricCard } from "./metric-card"
import { KPISettingsModal } from "./kpi-settings-modal"

interface KPIData {
  id: string
  name: string
  value: string
  target: number
  unit: string
  weight: number
  trend: { value: number; isPositive: boolean }
  icon: React.ReactNode
  visible: boolean
}

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
  const [showKPISettings, setShowKPISettings] = useState(false)
  const [franchises, setFranchises] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [networkStats, setNetworkStats] = useState<any>(null)
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalRoyalties: 0,
    averageCheck: 0,
    totalGames: 0,
  })
  const [kpiData, setKpiData] = useState([
    {
      id: "1",
      name: "Общая Выручка Сети",
      value: "0K ₽",
      target: 3000000,
      unit: "₽",
      weight: 30,
      trend: { value: 12.5, isPositive: true },
      icon: <DollarSign className="w-5 h-5" />,
      visible: true,
    },
    {
      id: "2",
      name: "Сводное Роялти (7%)",
      value: "0K ₽",
      target: 210000,
      unit: "₽",
      weight: 20,
      trend: { value: 8.2, isPositive: true },
      icon: <TrendingUp className="w-5 h-5" />,
      visible: true,
    },
    {
      id: "3",
      name: "Средний Чек",
      value: "0K ₽",
      target: 30000,
      unit: "₽",
      weight: 15,
      trend: { value: 5.1, isPositive: true },
      icon: <BarChart3 className="w-5 h-5" />,
      visible: true,
    },
    {
      id: "4",
      name: "Количество Игр",
      value: "0",
      target: 120,
      unit: "игр",
      weight: 10,
      trend: { value: 15, isPositive: true },
      icon: <Users className="w-5 h-5" />,
      visible: true,
    },
  ])

  const isUkEmployee = user?.role === "uk_employee"

  useEffect(() => {
    setKpiData((prev) =>
      prev.map((kpi) => {
        if (kpi.id === "1") {
          return {
            ...kpi,
            value: `${(metrics.totalRevenue / 1000).toFixed(0)}K ₽`,
          }
        }
        if (kpi.id === "2") {
          return {
            ...kpi,
            value: `${(metrics.totalRoyalties / 1000).toFixed(0)}K ₽`,
          }
        }
        if (kpi.id === "3") {
          return {
            ...kpi,
            value: `${(metrics.averageCheck / 1000).toFixed(0)}K ₽`,
          }
        }
        if (kpi.id === "4") {
          return {
            ...kpi,
            value: `${metrics.totalGames}`,
          }
        }
        return kpi
      }),
    )
  }, [metrics])

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("[v0] DashboardUK: Fetching data...")
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
          console.log("[v0] DashboardUK: Loaded franchises:", franchisesData.length)
        }

        if (transactionsRes.ok) {
          const data = await transactionsRes.json()
          transactionsData = Array.isArray(data) ? data : data.data || []
          setTransactions(transactionsData)
          console.log("[v0] DashboardUK: Loaded transactions:", transactionsData.length)
        }

        if (gamesRes.ok) {
          const data = await gamesRes.json()
          gamesData = Array.isArray(data) ? data : data.data || []
          console.log("[v0] DashboardUK: Loaded games:", gamesData.length)
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

        console.log("[v0] DashboardUK: Metrics calculated:", {
          revenue,
          royalties,
          avgCheck,
          games,
        })
      } catch (error) {
        console.error("[v0] DashboardUK: Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [getAuthHeaders])

  const handleSaveKPIs = (newKPISettings: any) => {
    setKpiData(
      kpiData.map((kpi) => ({
        ...kpi,
        visible: newKPISettings.find((s: any) => s.id === kpi.id)?.visible ?? kpi.visible,
      })),
    )
  }

  const visibleKPIs = kpiData.filter((kpi) => kpi.visible)

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
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            {isUkEmployee ? "Ключевые Показатели ваших франчизи" : "Ключевые Показатели"}
          </h2>
          <button
            onClick={() => setShowKPISettings(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-muted/50 hover:bg-muted text-muted-foreground text-xs font-medium rounded transition-colors"
          >
            <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Настройки</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {visibleKPIs.map((metric) => (
            <MetricCard
              key={metric.id}
              title={metric.name}
              value={metric.value}
              trend={metric.trend}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {franchises.slice(0, 6).map((franchise) => (
            <div key={franchise.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-foreground text-sm">{franchise.name}</h3>
                  <p className="text-xs text-muted-foreground">{franchise.city}</p>
                </div>
                <Target size={16} className="text-primary" />
              </div>
            </div>
          ))}
        </div>
        {franchises.length > 6 && (
          <p className="text-xs text-muted-foreground text-center">И еще {franchises.length - 6} франшиз...</p>
        )}
      </div>

      <div className="rounded-lg bg-card border border-border p-4 sm:p-6">
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-4">
          {isUkEmployee ? "Статистика делегированных франчизи" : "Статистика Сети"}
        </h3>
        {networkStats ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Средний Рейтинг</p>
              <p className="text-2xl font-bold text-foreground">{networkStats.averageRating}/5.0</p>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-1">Уровень Удовлетворения</p>
              <p className="text-2xl font-bold text-green-500">{networkStats.satisfactionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {networkStats.franchiseesMeetingTargets} из {networkStats.totalFranchisees} франшиз выполняют план
              </p>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-1">Выполнение Плана</p>
              <p
                className={`text-2xl font-bold ${networkStats.planFulfillment >= 100 ? "text-green-500" : networkStats.planFulfillment >= 80 ? "text-blue-500" : "text-orange-500"}`}
              >
                {networkStats.planFulfillment}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {networkStats.totalActualRevenue.toLocaleString("ru-RU")} ₽ из{" "}
                {networkStats.totalTargetRevenue.toLocaleString("ru-RU")} ₽
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {loading ? "Загрузка статистики..." : "Нет данных для отображения"}
          </div>
        )}
      </div>

      <KPISettingsModal
        isOpen={showKPISettings}
        onClose={() => setShowKPISettings(false)}
        onSave={handleSaveKPIs}
        currentKPIs={kpiData.map((k) => ({ id: k.id, name: k.name, visible: k.visible }))}
      />
    </div>
  )
}
