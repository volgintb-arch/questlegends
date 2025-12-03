"use client"
import { DollarSign, Percent, Users, Calendar, Clock, User, TrendingDown } from "lucide-react"
import { MetricCard } from "./metric-card"
import { DashboardGrid } from "./dashboard-grid"
import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect } from "react"
import { DealCardFull } from "./deal-card-full"
import { KPIWidget } from "./kpi-widget"

export function DashboardFranchisee() {
  const { user } = useAuth()
  const [selectedDeal, setSelectedDeal] = useState<any>(null)
  const [kpis, setKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.franchiseeId) return

      try {
        const [kpisRes, dealsRes, expensesRes, transactionsRes] = await Promise.all([
          fetch(`/api/kpi?franchiseeId=${user.franchiseeId}`),
          fetch(`/api/deals?franchiseeId=${user.franchiseeId}`),
          fetch(`/api/expenses?franchiseeId=${user.franchiseeId}`),
          fetch(`/api/transactions?franchiseeId=${user.franchiseeId}`),
        ])

        if (kpisRes.ok) setKpis(await kpisRes.json())
        if (dealsRes.ok) setDeals(await dealsRes.json())
        if (expensesRes.ok) setExpenses(await expensesRes.json())
        if (transactionsRes.ok) setTransactions(await transactionsRes.json())
      } catch (error) {
        console.error("[v0] Failed to fetch dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.franchiseeId])

  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()
  const currentKPI = kpis.find(
    (kpi) => kpi.periodType === "month" && kpi.periodNumber === currentMonth && kpi.periodYear === currentYear,
  )

  const revenue = transactions.reduce((sum, t) => sum + (t.revenue || 0), 0)
  const royalty = revenue * 0.07
  const fot = transactions.reduce((sum, t) => sum + (t.fot || 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const netProfit = revenue - royalty - fot - totalExpenses

  const metrics = [
    {
      title: "Итоговая Прибыль (P&L)",
      value: `${netProfit.toLocaleString("ru-RU")} ₽`,
      trend: { value: 18.5, isPositive: netProfit > 0 },
      icon: <DollarSign className="w-6 h-6" />,
      large: true,
    },
    {
      title: "Общие Расходы",
      value: `${totalExpenses.toLocaleString("ru-RU")} ₽`,
      trend: { value: 5.2, isPositive: false },
      icon: <TrendingDown className="w-5 h-5" />,
    },
    {
      title: "Мои Роялти (7%)",
      value: `${royalty.toLocaleString("ru-RU")} ₽`,
      trend: { value: 15.8, isPositive: true },
      icon: <Percent className="w-5 h-5" />,
    },
    {
      title: "Мой ФОТ",
      value: `${fot.toLocaleString("ru-RU")} ₽`,
      trend: { value: 3.2, isPositive: false },
      icon: <Users className="w-5 h-5" />,
    },
  ]

  const topLocations = [
    { name: "Москва - Центр", revenue: 850000 },
    { name: "Санкт-Петербург", revenue: 720000 },
    { name: "Казань", revenue: 650000 },
    { name: "Екатеринбург", revenue: 580000 },
    { name: "Новосибирск", revenue: 520000 },
  ]

  const maxRevenue = Math.max(...topLocations.map((l) => l.revenue))

  const upcomingGames = deals
    .filter((deal: any) => deal.gameDate && new Date(deal.gameDate) > new Date())
    .sort((a: any, b: any) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime())
    .slice(0, 4)
    .map((deal: any) => ({
      id: deal.id,
      title: deal.clientName || "Без названия",
      clientName: deal.clientName,
      clientPhone: deal.clientPhone,
      clientTelegram: deal.clientTelegram,
      participants: deal.participants || 0,
      package: deal.packageType || "Стандарт",
      gameDate: deal.gameDate,
      time: new Date(deal.gameDate).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      staff: "Не назначен",
      stage: deal.stage,
      checkPerPerson: deal.price && deal.participants ? Math.round(deal.price / deal.participants) : 0,
    }))

  const handleGameClick = (game: any) => {
    setSelectedDeal({
      ...game,
      location: user.franchiseeName || "Москва",
      amount: `${(game.participants * game.checkPerPerson).toLocaleString()} ₽`,
      daysOpen: Math.floor((new Date(game.gameDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    })
  }

  const handleDealUpdate = (updatedDeal: any) => {
    console.log("[v0] Deal updated:", updatedDeal)
    // TODO: API integration to update deal
  }

  const handleDealClose = () => {
    setSelectedDeal(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка данных...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {currentKPI && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">Мои KPI</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Целевые показатели на {currentKPI.periodType === "month" ? "месяц" : "квартал"} {currentKPI.periodNumber},{" "}
            {currentKPI.periodYear}
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {currentKPI.targetRevenue && (
              <KPIWidget
                metric="Выручка"
                targetValue={currentKPI.targetRevenue}
                actualValue={currentKPI.actualRevenue}
                unit="₽"
                periodEnd={new Date(currentYear, currentMonth, 0)}
              />
            )}
            {currentKPI.targetGames && (
              <KPIWidget
                metric="Количество игр"
                targetValue={currentKPI.targetGames}
                actualValue={currentKPI.actualGames}
                unit="игр"
                periodEnd={new Date(currentYear, currentMonth, 0)}
              />
            )}
            {currentKPI.maxExpenses && (
              <KPIWidget
                metric="Расходы"
                targetValue={currentKPI.maxExpenses}
                actualValue={currentKPI.actualExpenses}
                unit="₽"
                periodEnd={new Date(currentYear, currentMonth, 0)}
              />
            )}
          </div>
        </div>
      )}

      <DashboardGrid title="Моя Локация" description="Финансовый контроль и прибыль вашей франшизы">
        {metrics.map((metric, idx) => (
          <MetricCard key={idx} {...metric} className={metric.large ? "md:col-span-2" : ""} />
        ))}
      </DashboardGrid>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Сравнение Выручки</h3>
        <p className="text-sm text-muted-foreground mb-6">Топ-5 локаций по выручке за предыдущий месяц</p>

        <div className="space-y-4">
          {topLocations.map((location, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">{location.name}</span>
                <span className="text-primary font-semibold">{location.revenue.toLocaleString("ru-RU")} ₽</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${(location.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Предстоящие Игры</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Ближайшие запланированные мероприятия - нажмите для редактирования
        </p>

        {upcomingGames.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Нет запланированных игр. Добавьте сделки с датой игры.
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingGames.map((game: any) => (
              <button
                key={game.id}
                onClick={() => handleGameClick(game)}
                className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors border border-border text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary/20 p-3 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{game.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(game.gameDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={14} />
                        {game.time}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users size={14} />
                        {game.participants} чел.
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-medium">
                          {game.package}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User size={14} />
                  <span>{game.staff}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedDeal && (
        <DealCardFull
          deal={selectedDeal}
          onClose={handleDealClose}
          onUpdate={handleDealUpdate}
          onStageChange={(newStage) => console.log("[v0] Stage changed to:", newStage)}
          userRole="franchisee"
        />
      )}
    </div>
  )
}
