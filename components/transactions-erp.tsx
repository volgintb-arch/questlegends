"use client"

import { useState, useEffect } from "react"
import { Download, Search, Plus, Eye } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/contexts/auth-context"
import { FranchiseFinancialView } from "./franchise-financial-view"
import { TransactionFormModal } from "./transaction-form-modal"
import { TransactionDetailModal } from "./transaction-detail-modal"
import { AdvancedFilters, type FilterConfig } from "./advanced-filters"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface TransactionERP {
  id: string
  date: string
  amo_deal_id: string
  participants_N: number
  package_price_B: number
  location: string
  required_animators: number
  total_revenue: number
  royalty_amount: number
  fot_calculation: number
  status: "completed" | "pending" | "failed" | "cancelled"
}

interface TransactionsERPProps {
  role: "uk" | "franchisee" | "admin"
}

export function TransactionsERP({ role }: TransactionsERPProps) {
  const { user, getAuthHeaders } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<FilterConfig>({})
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionERP | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [transactions, setTransactions] = useState<TransactionERP[]>([])
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([])
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  })
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("month")

  useEffect(() => {
    fetchTransactions()
    loadLocations()
  }, [user])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const queryParams = user?.franchiseeId ? `?franchiseeId=${user.franchiseeId}` : ""
      const response = await fetch(`/api/transactions${queryParams}`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error("Failed to fetch transactions")

      const data = await response.json()
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error("[v0] Error fetching transactions:", error)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const loadLocations = async () => {
    try {
      const response = await fetch("/api/franchisees", {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const franchisees = await response.json()
        const locs = franchisees.map((f: any) => ({
          id: f.id,
          name: f.name,
        }))
        setLocations(locs)
      }
    } catch (error) {
      console.error("[v0] Error loading locations:", error)
    }
  }

  const handleCreateTransaction = (newTransaction: any) => {
    const transaction: TransactionERP = {
      id: `TXN-${String(transactions.length + 1).padStart(3, "0")}`,
      date: new Date().toISOString().split("T")[0],
      ...newTransaction,
      location: locations.find((l) => l.id === newTransaction.location_id)?.name || "Unknown",
      status: "completed",
    }
    setTransactions([transaction, ...transactions])
  }

  const handleViewTransaction = (transaction: TransactionERP) => {
    setSelectedTransaction(transaction)
    setShowDetailModal(true)
  }

  const generateChartData = (start: Date, end: Date, groupBy: string) => {
    const data = []
    const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]

    if (groupBy === "month") {
      // Group transactions by month
      const monthlyData = new Map<string, { revenue: number; expenses: number; fot: number; gamesCount: number }>()

      transactions.forEach((t: any) => {
        const date = new Date(t.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const existing = monthlyData.get(monthKey) || { revenue: 0, expenses: 0, fot: 0, gamesCount: 0 }
        monthlyData.set(monthKey, {
          revenue: existing.revenue + (t.total_revenue || 0),
          expenses: existing.expenses + (t.royalty_amount || 0),
          fot: existing.fot + (t.fot_calculation || 0),
          gamesCount: existing.gamesCount + 1,
        })
      })

      monthlyData.forEach((values, key) => {
        const [year, month] = key.split("-")
        const monthIndex = Number.parseInt(month) - 1
        data.push({
          label: monthNames[monthIndex],
          revenue: values.revenue,
          expenses: values.expenses,
          fot: values.fot,
          gamesCount: values.gamesCount,
          avgCheck: values.gamesCount > 0 ? values.revenue / values.gamesCount : 0,
        })
      })
    }

    return data.slice(-12) // Last 12 periods
  }

  const chartData = generateChartData(dateRange.start, dateRange.end, groupBy)

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      searchTerm === "" ||
      t.amo_deal_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.location.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesLocation = !filters.location || t.location === filters.location
    const matchesStatus = !filters.status || t.status === filters.status

    const transactionDate = new Date(t.date)
    const matchesDateRange =
      (!filters.dateFrom || transactionDate >= new Date(filters.dateFrom)) &&
      (!filters.dateTo || transactionDate <= new Date(filters.dateTo))

    const matchesAmount =
      (!filters.amountMin || t.total_revenue >= filters.amountMin) &&
      (!filters.amountMax || t.total_revenue <= filters.amountMax)

    const matchesParticipants =
      (!filters.participantsMin || t.participants_N >= filters.participantsMin) &&
      (!filters.participantsMax || t.participants_N <= filters.participantsMax)

    return matchesSearch && matchesLocation && matchesStatus && matchesDateRange && matchesAmount && matchesParticipants
  })

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total_revenue, 0)
  const totalRoyalty = filteredTransactions.reduce((sum, t) => sum + t.royalty_amount, 0)
  const totalFOT = filteredTransactions.reduce((sum, t) => sum + t.fot_calculation, 0)
  const avgRevenue = filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0

  if (role === "uk") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Финансы / ERP</h1>
          <p className="text-sm text-muted-foreground mt-1">Полный контроль финансовых показателей всей сети</p>
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по франчайзи, локации или показателям..."
            value={filters.franchiseSearch || ""}
            onChange={(e) => setFilters({ ...filters, franchiseSearch: e.target.value })}
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <FranchiseFinancialView searchTerm={filters.franchiseSearch || ""} />
      </div>
    )
  }

  if (role === "franchisee") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Финансовая Аналитика / ERP</h1>
            <p className="text-sm text-muted-foreground mt-1">Динамика доходов и расходов</p>
          </div>

          <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">От</label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                max={filters.dateTo || ""}
                className="bg-background border border-border rounded px-2 py-1 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">До</label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                min={filters.dateFrom || ""}
                className="bg-background border border-border rounded px-2 py-1 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Общий Доход</p>
            <p className="text-2xl font-bold text-green-500">
              {chartData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()} ₽
            </p>
            <p className="text-xs text-muted-foreground mt-1">За выбранный период</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Общие Расходы</p>
            <p className="text-2xl font-bold text-orange-500">
              {chartData.reduce((sum, d) => sum + d.expenses, 0).toLocaleString()} ₽
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">ФОТ</p>
            <p className="text-2xl font-bold text-purple-500">
              {chartData.reduce((sum, d) => sum + d.fot, 0).toLocaleString()} ₽
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Средний Чек</p>
            <p className="text-2xl font-bold text-blue-500">
              {Math.round(chartData.reduce((sum, d) => sum + d.avgCheck, 0) / chartData.length).toLocaleString()} ₽
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Динамика Доходов и Расходов</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Доход" strokeWidth={2} />
              <Line type="monotone" dataKey="expenses" stroke="#f97316" name="Расходы" strokeWidth={2} />
              <Line type="monotone" dataKey="profit" stroke="#3b82f6" name="Прибыль" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Количество Дохода по Месяцам</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="revenue" fill="#10b981" name="Доход" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Количество Расходов по Месяцам</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="expenses" fill="#f97316" name="Расходы" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">ФОТ по Месяцам</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="fot" fill="#a855f7" name="ФОТ" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Средний Чек по Месяцам</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line type="monotone" dataKey="avgCheck" stroke="#3b82f6" name="Средний Чек" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="p-6 text-center">Загрузка транзакций...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">ERP Система</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "uk" ? "Общая аналитика по всем франшизам" : "Учет и аналитика транзакций вашей локации"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AdvancedFilters type="transactions" filters={filters} onFiltersChange={setFilters} locations={locations} />

          {(role === "franchisee" || role === "admin") && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            >
              <Plus size={18} />
              <span className="text-sm">Новая Транзакция</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">Общая Выручка</p>
          <p className="text-2xl font-bold text-green-500">{totalRevenue.toLocaleString()} ₽</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredTransactions.length} игр</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">Роялти (7%)</p>
          <p className="text-2xl font-bold text-orange-500">{totalRoyalty.toLocaleString()} ₽</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">ФОТ</p>
          <p className="text-2xl font-bold text-purple-500">{totalFOT.toLocaleString()} ₽</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">Средний Чек</p>
          <p className="text-2xl font-bold text-blue-500">{avgRevenue.toLocaleString()} ₽</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по ID сделки, транзакции или локации..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors whitespace-nowrap">
          <Download size={18} />
          <span className="text-sm">Экспорт</span>
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead className="text-xs font-semibold text-muted-foreground">Дата</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">ID Сделки</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Локация</TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground">Участников</TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground">Выручка</TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground">Роялти</TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground">ФОТ</TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground">Прибыль</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Статус</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => {
              const netProfit = transaction.total_revenue - transaction.royalty_amount - transaction.fot_calculation
              return (
                <TableRow key={transaction.id} className="border-b border-border/50 hover:bg-muted/30">
                  <TableCell className="text-sm text-foreground">{transaction.date}</TableCell>
                  <TableCell className="text-sm font-medium text-primary">{transaction.amo_deal_id}</TableCell>
                  <TableCell className="text-sm text-foreground">{transaction.location}</TableCell>
                  <TableCell className="text-right text-sm text-foreground">{transaction.participants_N}</TableCell>
                  <TableCell className="text-right text-sm font-semibold text-green-500">
                    {transaction.total_revenue.toLocaleString()} ₽
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-orange-500">
                    {transaction.royalty_amount.toLocaleString()} ₽
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-purple-500">
                    {transaction.fot_calculation.toLocaleString()} ₽
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-green-600">
                    {netProfit.toLocaleString()} ₽
                  </TableCell>
                  <TableCell>
                    {transaction.status === "completed" && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-500">
                        Завершено
                      </span>
                    )}
                    {transaction.status === "pending" && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-500">
                        Ожидание
                      </span>
                    )}
                    {transaction.status === "failed" && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-500">Ошибка</span>
                    )}
                    {transaction.status === "cancelled" && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-500">Отменена</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleViewTransaction(transaction)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="Подробнее"
                    >
                      <Eye size={16} className="text-muted-foreground" />
                    </button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <p className="text-muted-foreground">Нет транзакций по данным фильтрам</p>
        </div>
      )}

      {(role === "franchisee" || role === "admin") && (
        <TransactionFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTransaction}
          locations={locations}
        />
      )}

      <TransactionDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        transaction={selectedTransaction}
      />
    </div>
  )
}
