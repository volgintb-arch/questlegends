"use client"

import { useState, useEffect } from "react"
import { Download, Search, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2, MoreHorizontal } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { FranchiseFinancialView } from "./franchise-financial-view"
import { TransactionFormModal } from "./transaction-form-modal"
import type { FilterConfig } from "./advanced-filters"
import * as XLSX from "xlsx"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Transaction {
  id: string
  date: string
  type: "income" | "expense"
  amount: number
  description: string
  category?: string
  franchiseeId?: string
  franchiseeName?: string
  franchiseeCity?: string
  gameLeadId?: string
  createdAt: string
}

interface TransactionsERPProps {
  role: "uk" | "franchisee" | "own_point" | "admin" | "uk_employee" | "super_admin"
}

interface FranchiseeData {
  id: string
  name: string
  royaltyPercent: number
  isOwnPoint?: boolean
}

export function TransactionsERP({ role }: TransactionsERPProps) {
  const { user, getAuthHeaders } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<FilterConfig>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createTransactionType, setCreateTransactionType] = useState<"income" | "expense">("income")
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([])
  const [franchiseeData, setFranchiseeData] = useState<FranchiseeData | null>(null)

  const filteredTransactions = transactions.filter((t) => {
    const franchiseeMatch = !filters.franchiseSearch || t.franchiseeName?.includes(filters.franchiseSearch)
    const dateMatch =
      !filters.dateFrom ||
      !filters.dateTo ||
      (new Date(t.date) >= new Date(filters.dateFrom) && new Date(t.date) <= new Date(filters.dateTo))
    const searchMatch =
      !searchTerm ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchTerm.toLowerCase())
    return franchiseeMatch && dateMatch && searchMatch
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch transactions
        const queryParams = user?.franchiseeId ? `?franchiseeId=${user.franchiseeId}` : ""
        const response = await fetch(`/api/transactions${queryParams}`, {
          headers: getAuthHeaders(),
        })
        if (!response.ok) throw new Error("Failed to fetch transactions")

        const data = await response.json()
        setTransactions(data.transactions || [])

        let franchiseeData: FranchiseeData | null = null
        const isUK = role === "uk" || role === "uk_employee" || role === "super_admin"
        if (!isUK && user?.franchiseeId) {
          const franchiseeRes = await fetch(`/api/franchisees/${user.franchiseeId}`, {
            headers: getAuthHeaders(),
          })
          if (franchiseeRes.ok) {
            const franchiseeResult = await franchiseeRes.json()
            franchiseeData = franchiseeResult.data || franchiseeResult

            // Check if this is an own_point by looking at the owner's role
            const usersRes = await fetch(`/api/users?franchiseeId=${user.franchiseeId}`, {
              headers: getAuthHeaders(),
            })
            if (usersRes.ok) {
              const usersData = await usersRes.json()
              const usersList = usersData.data || usersData
              const owner = usersList.find((u: any) => u.role === "own_point" || u.role === "franchisee")
              if (owner && owner.role === "own_point") {
                franchiseeData.isOwnPoint = true
              }
            }

            console.log("[v0] Franchisee data loaded:", franchiseeData)
          }
        }

        setFranchiseeData(franchiseeData)

        // Load locations
        const locationResponse = await fetch("/api/franchisees", {
          headers: getAuthHeaders(),
        })
        if (locationResponse.ok) {
          const franchisees = await locationResponse.json()
          const locs = franchisees.map((f: any) => ({
            id: f.id,
            name: f.name,
          }))
          setLocations(locs)
        }
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, role])

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

  const loadFranchiseeData = async () => {
    try {
      const response = await fetch(`/api/franchisees/${user?.franchiseeId}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const result = await response.json()
        setFranchiseeData(result.data || result)
      }
    } catch (error) {
      console.error("Error loading franchisee data:", error)
    }
  }

  const handleCreateTransaction = () => {
    fetchTransactions()
    setShowCreateModal(false)
    setEditingTransaction(null)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setShowCreateModal(true)
  }

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!confirm(`Удалить транзакцию "${transaction.description || getCategoryLabel(transaction.category)}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (!response.ok) throw new Error("Failed to delete transaction")

      fetchTransactions()
    } catch (error) {
      console.error("[v0] Error deleting transaction:", error)
      alert("Ошибка при удалении транзакции")
    }
  }

  const handleAddIncome = () => {
    setEditingTransaction(null)
    setCreateTransactionType("income")
    setShowCreateModal(true)
  }

  const handleAddExpense = () => {
    setEditingTransaction(null)
    setCreateTransactionType("expense")
    setShowCreateModal(true)
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()

    // Determine if user is UK/super_admin
    const isUK = role === "uk" || role === "uk_employee" || role === "super_admin"

    // Sheet 1: Summary for Network (UK only) or Franchisee
    if (isUK) {
      // For UK: Calculate summary for entire network
      const totalRevenue = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
      const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
      const totalRoyalties = totalRevenue * 0.07 // 7% royalty
      const totalProfit = totalRevenue - totalExpenses

      const networkSummary = [
        { Показатель: "Выручка (вся сеть)", Значение: totalRevenue, Единица: "₽" },
        { Показатель: "Роялти (7%)", Значение: totalRoyalties, Единица: "₽" },
        { Показатель: "Расходы", Значение: totalExpenses, Единица: "₽" },
        { Показатель: "Прибыль", Значение: totalProfit, Единица: "₽" },
      ]

      const networkSheet = XLSX.utils.json_to_sheet(networkSummary)
      XLSX.utils.book_append_sheet(workbook, networkSheet, "Сводная по сети")

      console.log("[v0] Export: Sample transaction", transactions[0])
      console.log("[v0] Export: Unique franchisees", [
        ...new Set(transactions.map((t) => t.franchiseeName || t.franchiseeCity || "Без франчайзи")),
      ])

      // Sheet 2: Breakdown by Franchisee
      const franchiseeBreakdown: Record<
        string,
        { revenue: number; expenses: number; royalties: number; profit: number }
      > = {}

      transactions.forEach((t) => {
        const franchiseeName = t.franchiseeName || t.franchiseeCity || "Без франчайзи"
        if (!franchiseeBreakdown[franchiseeName]) {
          franchiseeBreakdown[franchiseeName] = { revenue: 0, expenses: 0, royalties: 0, profit: 0 }
        }
        if (t.type === "income") {
          franchiseeBreakdown[franchiseeName].revenue += t.amount
        } else {
          franchiseeBreakdown[franchiseeName].expenses += t.amount
        }
      })

      // Calculate royalties and profit for each franchisee
      Object.keys(franchiseeBreakdown).forEach((name) => {
        const data = franchiseeBreakdown[name]
        data.royalties = Math.round(data.revenue * 0.07)
        data.profit = data.revenue - data.expenses
      })

      const franchiseeData = Object.entries(franchiseeBreakdown).map(([name, data]) => ({
        Франчайзи: name,
        Выручка: data.revenue,
        "Роялти (7%)": data.royalties,
        Расходы: data.expenses,
        Прибыль: data.profit,
        "Маржа %": data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) + "%" : "0%",
      }))

      console.log("[v0] Export: Franchisee breakdown", franchiseeData)

      const franchiseeSheet = XLSX.utils.json_to_sheet(franchiseeData)
      XLSX.utils.book_append_sheet(workbook, franchiseeSheet, "По франчайзи")
    } else {
      const totalRevenue = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
      const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)

      // Calculate royalty only if not own_point
      const royaltyPercent = franchiseeData?.royaltyPercent || 7
      const totalRoyalty = Math.round(totalRevenue * (royaltyPercent / 100))
      const totalProfit = totalRevenue - totalExpenses - totalRoyalty

      const franchiseeSummary = [
        { Показатель: "Выручка", Значение: totalRevenue, Единица: "₽" },
        { Показатель: "Расходы", Значение: totalExpenses, Единица: "₽" },
      ]

      // Add royalty row only if not own_point
      if (!franchiseeData?.isOwnPoint) {
        franchiseeSummary.push({
          Показатель: `Роялти (${royaltyPercent}%)`,
          Значение: totalRoyalty,
          Единица: "₽",
        })
      }

      franchiseeSummary.push(
        { Показатель: "Прибыль", Значение: totalProfit, Единица: "₽" },
        {
          Показатель: "Маржа прибыли",
          Значение: totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : "0%",
          Единица: "",
        },
      )

      const summarySheet = XLSX.utils.json_to_sheet(franchiseeSummary)
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Сводная аналитика")
    }

    // Sheet: Transactions data (for all roles)
    const exportData = transactions.map((t) => ({
      ID: t.id,
      Дата: new Date(t.date).toLocaleDateString("ru-RU"),
      Тип: t.type === "income" ? "Доход" : "Расход",
      Сумма: t.amount,
      Категория: getCategoryLabel(t.category),
      Описание: t.description,
      Франчайзи: t.franchiseeName || t.franchiseeCity || "",
      Создано: new Date(t.createdAt).toLocaleDateString("ru-RU"),
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    XLSX.utils.book_append_sheet(workbook, worksheet, "Транзакции")

    // Sheet: Breakdown by Category
    const categoryBreakdown: Record<string, { income: number; expense: number; count: number }> = {}

    transactions.forEach((t) => {
      const categoryName = getCategoryLabel(t.category)
      if (!categoryBreakdown[categoryName]) {
        categoryBreakdown[categoryName] = { income: 0, expense: 0, count: 0 }
      }
      if (t.type === "income") {
        categoryBreakdown[categoryName].income += t.amount
      } else {
        categoryBreakdown[categoryName].expense += t.amount
      }
      categoryBreakdown[categoryName].count++
    })

    const categoryData = Object.entries(categoryBreakdown).map(([category, data]) => ({
      Категория: category,
      Доходы: data.income,
      Расходы: data.expense,
      Баланс: data.income - data.expense,
      "Количество транзакций": data.count,
    }))

    const categorySheet = XLSX.utils.json_to_sheet(categoryData)
    XLSX.utils.book_append_sheet(workbook, categorySheet, "По категориям")

    // Sheet: Monthly Breakdown
    const monthlyData: Record<string, { income: number; expense: number }> = {}

    transactions.forEach((t) => {
      const monthKey = new Date(t.date).toLocaleDateString("ru-RU", { year: "numeric", month: "long" })
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 }
      }
      if (t.type === "income") {
        monthlyData[monthKey].income += t.amount
      } else {
        monthlyData[monthKey].expense += t.amount
      }
    })

    const monthlyBreakdown = Object.entries(monthlyData).map(([month, data]) => ({
      Месяц: month,
      Доходы: data.income,
      Расходы: data.expense,
      Прибыль: data.income - data.expense,
      Маржа: data.income > 0 ? `${(((data.income - data.expense) / data.income) * 100).toFixed(1)}%` : "0%",
    }))

    const monthlySheet = XLSX.utils.json_to_sheet(monthlyBreakdown)
    XLSX.utils.book_append_sheet(workbook, monthlySheet, "По месяцам")

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `erp_analysis_${new Date().toISOString().split("T")[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case "prepayment":
        return "Предоплата"
      case "postpayment":
        return "Постоплата"
      case "fot_animators":
        return "ФОТ Аниматоры"
      case "fot_hosts":
        return "ФОТ Ведущие"
      case "fot_djs":
        return "ФОТ Диджеи"
      case "fot_admin":
        return "ФОТ Администратор"
      case "fot":
        return "ФОТ"
      case "rent":
        return "Аренда"
      case "marketing":
        return "Маркетинг"
      case "equipment":
        return "Оборудование"
      case "other_income":
        return "Прочий доход"
      case "other_expense":
        return "Прочий расход"
      default:
        return category || "Другое"
    }
  }

  const generateChartData = () => {
    const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
    const monthlyData = new Map<string, { month: string; revenue: number; expenses: number; profit: number }>()

    // Initialize last 6 months
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      monthlyData.set(monthKey, {
        month: monthNames[date.getMonth()],
        revenue: 0,
        expenses: 0,
        profit: 0,
      })
    }

    transactions.forEach((t) => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!monthlyData.has(monthKey)) return

      const existing = monthlyData.get(monthKey)!
      const amount = Number.parseFloat(String(t.amount)) || 0

      if (t.type === "income") {
        existing.revenue += amount
      } else if (t.type === "expense") {
        existing.expenses += amount
      }

      existing.profit = existing.revenue - existing.expenses
      monthlyData.set(monthKey, existing)
    })

    return Array.from(monthlyData.values())
  }

  const chartData = generateChartData()

  const totalRevenue = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (Number.parseFloat(String(t.amount)) || 0), 0)

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (Number.parseFloat(String(t.amount)) || 0), 0)

  const totalFOT = transactions
    .filter((t) => t.type === "expense" && (t.category?.startsWith("fot") || t.category === "fot"))
    .reduce((sum, t) => sum + (Number.parseFloat(String(t.amount)) || 0), 0)

  const profit = totalRevenue - totalExpenses

  const isOwnPoint = role === "own_point" || user?.role === "own_point" || franchiseeData?.isOwnPoint
  const royaltyPercent = isOwnPoint ? 0 : franchiseeData?.royaltyPercent || 7
  const royaltyAmount = isOwnPoint ? 0 : Math.round(totalRevenue * (royaltyPercent / 100))

  const isFranchiseeOrAdmin = role === "franchisee" || role === "admin"

  if (role === "uk" || role === "uk_employee" || role === "super_admin") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Финансы / ERP</h1>
            <p className="text-sm text-muted-foreground mt-1">Полный контроль финансовых показателей всей сети</p>
          </div>
          <Button onClick={exportToExcel} variant="outline" className="gap-2 bg-transparent">
            <Download size={16} />
            Экспорт в Excel
          </Button>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Финансовая Аналитика / ERP</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "admin"
              ? "Учет и аналитика транзакций вашей локации"
              : "Учет и аналитика транзакций ваших локаций"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleAddIncome} className="bg-green-600 hover:bg-green-700 text-white">
            <ArrowDownCircle size={16} className="mr-2" />
            Добавить поступление
          </Button>
          <Button onClick={handleAddExpense} variant="destructive">
            <ArrowUpCircle size={16} className="mr-2" />
            Добавить расход
          </Button>
        </div>
      </div>

      {/* Date filter row */}
      <div className="flex items-center gap-3">
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
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download size={16} />
          Экспорт Excel
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Общий Доход</p>
          <p className="text-3xl font-bold text-green-500">{totalRevenue.toLocaleString()} ₽</p>
          <p className="text-xs text-muted-foreground mt-2">Выручка за период</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Общие Расходы</p>
          <p className="text-3xl font-bold text-orange-500">{totalExpenses.toLocaleString()} ₽</p>
          <p className="text-xs text-muted-foreground mt-2">Все расходы</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">ФОТ</p>
          <p className="text-3xl font-bold text-purple-500">{totalFOT.toLocaleString()} ₽</p>
          <p className="text-xs text-muted-foreground mt-2">Аниматоры, ведущие, DJ</p>
        </div>

        {!isOwnPoint && isFranchiseeOrAdmin && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-2">Роялти к оплате</p>
            <p className="text-3xl font-bold text-blue-500">{royaltyAmount.toLocaleString()} ₽</p>
            <p className="text-xs text-muted-foreground mt-2">{royaltyPercent}% от дохода</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Прибыль</p>
          <p className={`text-3xl font-bold ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {profit.toLocaleString()} ₽
          </p>
          <p className="text-xs text-muted-foreground mt-2">Доход - Расходы</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-6">Динамика за 6 месяцев</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} dy={10} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number) => [`${value.toLocaleString()} ₽`, ""]}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                fill="url(#colorRevenue)"
                name="Доход"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#f97316"
                fill="url(#colorExpenses)"
                name="Расходы"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-6">Прибыль по месяцам</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} dy={10} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number) => [`${value.toLocaleString()} ₽`, "Прибыль"]}
              />
              <Bar dataKey="profit" fill="#3b82f6" name="Прибыль" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Транзакции</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-primary w-64"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">Дата</TableHead>
              <TableHead className="text-muted-foreground">Тип</TableHead>
              <TableHead className="text-muted-foreground">Категория</TableHead>
              <TableHead className="text-muted-foreground">Описание</TableHead>
              <TableHead className="text-muted-foreground text-right">Сумма</TableHead>
              <TableHead className="text-muted-foreground w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Нет транзакций
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((t) => (
                <TableRow key={t.id} className="border-border hover:bg-muted/50">
                  <TableCell className="text-foreground">{new Date(t.date).toLocaleDateString("ru-RU")}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        t.type === "income" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {t.type === "income" ? "Доход" : "Расход"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{getCategoryLabel(t.category)}</TableCell>
                  <TableCell className="text-foreground max-w-xs truncate">{t.description}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${t.type === "income" ? "text-green-500" : "text-red-500"}`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {Number.parseFloat(String(t.amount)).toLocaleString()} ₽
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-muted rounded">
                          <MoreHorizontal size={16} className="text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditTransaction(t)}>
                          <Pencil size={14} className="mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteTransaction(t)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showCreateModal && (
        <TransactionFormModal
          onClose={() => {
            setShowCreateModal(false)
            setEditingTransaction(null)
          }}
          onSubmit={handleCreateTransaction}
          defaultType={createTransactionType}
          transaction={editingTransaction}
        />
      )}
    </div>
  )
}
