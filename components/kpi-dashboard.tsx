"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Target, MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface FranchiseePerformance {
  id: string
  name: string
  location: string
  revenue: number
  expenses: number
  profit: number
  margin: number
  gamesCount: number
  growth: number
  riskScore: number
  status: "excellent" | "good" | "warning" | "critical"
}

export function KPIDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedMetric, setSelectedMetric] = useState("revenue")
  const [franchisees, setFranchisees] = useState<FranchiseePerformance[]>([])
  const [revenueData, setRevenueData] = useState([])
  const [gamesDistribution, setGamesDistribution] = useState([])
  const [forecastData, setForecastData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKPIData = async () => {
      try {
        const response = await fetch(`/api/kpi/analytics?period=${selectedPeriod}`)
        if (response.ok) {
          const data = await response.json()
          setFranchisees(data.franchisees || [])
          setRevenueData(data.revenueData || [])
          setGamesDistribution(data.gamesDistribution || [])
          setForecastData(data.forecastData || [])
        }
      } catch (error) {
        console.error("Failed to fetch KPI data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchKPIData()
  }, [selectedPeriod])

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка аналитики...</div>
  }

  if (franchisees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Target className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">Данных для аналитики пока нет</p>
        <p className="text-sm">Начните работу с франшизами для отображения метрик</p>
      </div>
    )
  }

  const totalRevenue = franchisees.reduce((sum, f) => sum + f.revenue, 0)
  const totalProfit = franchisees.reduce((sum, f) => sum + f.profit, 0)
  const totalGames = franchisees.reduce((sum, f) => sum + f.gamesCount, 0)
  const avgMargin = franchisees.reduce((sum, f) => sum + f.margin, 0) / franchisees.length

  const getStatusBadge = (status: string) => {
    const variants = {
      excellent: "bg-green-100 text-green-800 border-green-200",
      good: "bg-blue-100 text-blue-800 border-blue-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
      critical: "bg-red-100 text-red-800 border-red-200",
    }
    const labels = {
      excellent: "Отлично",
      good: "Хорошо",
      warning: "Внимание",
      critical: "Критично",
    }
    return <Badge className={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Аналитика Сети</h2>
          <p className="text-muted-foreground text-sm">Продвинутая аналитика и KPI всех франшиз</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Неделя</SelectItem>
            <SelectItem value="month">Месяц</SelectItem>
            <SelectItem value="quarter">Квартал</SelectItem>
            <SelectItem value="year">Год</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              +12.5%
            </Badge>
          </div>
          <div className="text-2xl font-bold">{(totalRevenue / 1000).toFixed(0)}K ₽</div>
          <p className="text-sm text-muted-foreground">Общая Выручка</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              +8.2%
            </Badge>
          </div>
          <div className="text-2xl font-bold">{(totalProfit / 1000).toFixed(0)}K ₽</div>
          <p className="text-sm text-muted-foreground">Чистая Прибыль</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {totalGames} игр
            </Badge>
          </div>
          <div className="text-2xl font-bold">{avgMargin.toFixed(1)}%</div>
          <p className="text-sm text-muted-foreground">Средняя Маржа</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              107%
            </Badge>
          </div>
          <div className="text-2xl font-bold">
            {franchisees.filter((f) => f.status !== "critical").length}/{franchisees.length}
          </div>
          <p className="text-sm text-muted-foreground">Выполнение Плана</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Динамика Выручки</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Выручка" strokeWidth={2} />
              <Line type="monotone" dataKey="profit" stroke="#10b981" name="Прибыль" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Games Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Распределение Игр по Локациям</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gamesDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {gamesDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Прогноз Выручки (3 месяца)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="actual" fill="#3b82f6" name="Факт" />
            <Bar dataKey="forecast" fill="#10b981" name="Прогноз" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Franchisee Performance Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Рейтинг Франшиз</h3>
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">По Выручке</SelectItem>
              <SelectItem value="profit">По Прибыли</SelectItem>
              <SelectItem value="margin">По Марже</SelectItem>
              <SelectItem value="growth">По Росту</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">#</th>
                <th className="text-left py-3 px-4 font-medium">Франшиза</th>
                <th className="text-left py-3 px-4 font-medium">Локация</th>
                <th className="text-right py-3 px-4 font-medium">Выручка</th>
                <th className="text-right py-3 px-4 font-medium">Прибыль</th>
                <th className="text-right py-3 px-4 font-medium">Маржа</th>
                <th className="text-right py-3 px-4 font-medium">Игры</th>
                <th className="text-right py-3 px-4 font-medium">Рост</th>
                <th className="text-right py-3 px-4 font-medium">Риск</th>
                <th className="text-center py-3 px-4 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {franchisees
                .sort(
                  (a, b) =>
                    (b[selectedMetric as keyof FranchiseePerformance] as number) -
                    (a[selectedMetric as keyof FranchiseePerformance] as number),
                )
                .map((f, index) => (
                  <tr key={f.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4 font-medium">{f.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {f.location}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">{(f.revenue / 1000).toFixed(0)}K ₽</td>
                    <td className="py-3 px-4 text-right font-medium text-green-600">
                      {(f.profit / 1000).toFixed(0)}K ₽
                    </td>
                    <td className="py-3 px-4 text-right">{f.margin.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right">{f.gamesCount}</td>
                    <td className="py-3 px-4 text-right">
                      <div
                        className={`flex items-center justify-end gap-1 ${
                          f.growth >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {f.growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(f.growth).toFixed(1)}%
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge
                        variant="secondary"
                        className={
                          f.riskScore < 30
                            ? "bg-green-100 text-green-800"
                            : f.riskScore < 50
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {f.riskScore}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(f.status)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Risk Alerts */}
      {franchisees.some((f) => f.status === "critical" || f.status === "warning") && (
        <Card className="p-6 bg-orange-50 border-orange-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2">Требуется Внимание</h3>
              <div className="space-y-2">
                {franchisees
                  .filter((f) => f.status === "critical" || f.status === "warning")
                  .map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium">{f.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {f.status === "critical" ? "Критическое снижение показателей" : "Снижение эффективности"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Подробнее
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
