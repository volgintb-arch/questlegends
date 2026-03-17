"use client"

import { useState, useEffect, useMemo } from "react"
import { Download, Search, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2, MoreHorizontal, X } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [amountMin, setAmountMin] = useState("")
  const [amountMax, setAmountMax] = useState("")

  const filteredTransactions = transactions.filter((t) => {
    const franchiseeMatch = !filters.franchiseSearch || t.franchiseeName?.includes(filters.franchiseSearch)
    const dateFromMatch = !filters.dateFrom || new Date(t.date) >= new Date(filters.dateFrom)
    const dateToMatch = !filters.dateTo || new Date(t.date) <= new Date(filters.dateTo)
    const searchMatch =
      !searchTerm ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const typeMatch = filterType === "all" || t.type === filterType
    const categoryMatch = filterCategory === "all" || t.category === filterCategory
    const amountMinMatch = !amountMin || t.amount >= Number(amountMin)
    const amountMaxMatch = !amountMax || t.amount <= Number(amountMax)
    return franchiseeMatch && dateFromMatch && dateToMatch && searchMatch && typeMatch && categoryMatch && amountMinMatch && amountMaxMatch
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
    const isUK = role === "uk" || role === "uk_employee" || role === "super_admin"

    const setColWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
      ws["!cols"] = widths.map((w) => ({ wch: w }))
    }

    const exportTx = filteredTransactions
    // === Лист 1: Сводная ===
    if (isUK) {
      const totalRevenue = exportTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
      const totalExpenses = exportTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
      const totalTransactions = exportTx.length
      const avgTransaction = totalTransactions > 0 ? Math.round((totalRevenue + totalExpenses) / totalTransactions) : 0

      // === Рассчёт по франчайзи (используем для агрегации роялти) ===
      const defaultRoyaltyRate = 0.07
      const franchiseeBreakdown: Record<string, { revenue: number; expenses: number; royalties: number; profit: number; txCount: number }> = {}

      exportTx.forEach((t) => {
        const name = t.franchiseeName || t.franchiseeCity || "Без франчайзи"
        if (!franchiseeBreakdown[name]) {
          franchiseeBreakdown[name] = { revenue: 0, expenses: 0, royalties: 0, profit: 0, txCount: 0 }
        }
        if (t.type === "income") franchiseeBreakdown[name].revenue += t.amount
        else franchiseeBreakdown[name].expenses += t.amount
        franchiseeBreakdown[name].txCount++
      })

      Object.keys(franchiseeBreakdown).forEach((name) => {
        const d = franchiseeBreakdown[name]
        d.royalties = Math.round(d.revenue * defaultRoyaltyRate)
        d.profit = d.revenue - d.expenses
      })

      const totalRoyalties = Object.values(franchiseeBreakdown).reduce((sum, d) => sum + d.royalties, 0)
      const totalProfit = totalRevenue - totalExpenses

      // === Лист 1: Сводная ===
      const networkSummary = [
        { Показатель: "Выручка (вся сеть)", Значение: totalRevenue, Единица: "₽" },
        { Показатель: "Роялти", Значение: totalRoyalties, Единица: "₽" },
        { Показатель: "Расходы", Значение: totalExpenses, Единица: "₽" },
        { Показатель: "Прибыль", Значение: totalProfit, Единица: "₽" },
        { Показатель: "Всего транзакций", Значение: totalTransactions, Единица: "шт" },
        { Показатель: "Средняя транзакция", Значение: avgTransaction, Единица: "₽" },
        { Показатель: "Маржа прибыли", Значение: totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : "0%", Единица: "" },
      ]

      const networkSheet = XLSX.utils.json_to_sheet(networkSummary)
      setColWidths(networkSheet, [30, 18, 8])
      XLSX.utils.book_append_sheet(workbook, networkSheet, "Сводная по сети")

      // === Лист 2: По франчайзи ===
      const fbData = Object.entries(franchiseeBreakdown).map(([name, d]) => ({
        Франчайзи: name,
        Выручка: d.revenue,
        Роялти: d.royalties,
        Расходы: d.expenses,
        Прибыль: d.profit,
        "Маржа %": d.revenue > 0 ? `${((d.profit / d.revenue) * 100).toFixed(1)}%` : "0%",
        Транзакций: d.txCount,
      }))

      const franchiseeSheet = XLSX.utils.json_to_sheet(fbData)
      setColWidths(franchiseeSheet, [30, 15, 15, 15, 15, 12, 12])
      XLSX.utils.book_append_sheet(workbook, franchiseeSheet, "По франчайзи")
    } else {
      const totalRevenue = exportTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
      const totalExpenses = exportTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
      const royaltyPercent = Number(franchiseeData?.royaltyPercent) || 0
      const totalRoyalty = Math.round(totalRevenue * (royaltyPercent / 100))
      const totalProfit = totalRevenue - totalExpenses - totalRoyalty

      const summary: { Показатель: string; Значение: number | string; Единица: string }[] = [
        { Показатель: "Выручка", Значение: totalRevenue, Единица: "₽" },
        { Показатель: "Расходы", Значение: totalExpenses, Единица: "₽" },
      ]
      if (!franchiseeData?.isOwnPoint) {
        summary.push({ Показатель: `Роялти (${royaltyPercent}%)`, Значение: totalRoyalty, Единица: "₽" })
      }
      summary.push(
        { Показатель: "Прибыль", Значение: totalProfit, Единица: "₽" },
        { Показатель: "Маржа прибыли", Значение: totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : "0%", Единица: "" },
        { Показатель: "Всего транзакций", Значение: exportTx.length, Единица: "шт" },
      )

      const summarySheet = XLSX.utils.json_to_sheet(summary)
      setColWidths(summarySheet, [30, 18, 8])
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Сводная аналитика")
    }

    // === Лист: Все транзакции ===
    const exportData = exportTx.map((t) => ({
      Дата: new Date(t.date).toLocaleDateString("ru-RU"),
      Тип: t.type === "income" ? "Доход" : "Расход",
      Сумма: t.amount,
      Категория: getCategoryLabel(t.category),
      Описание: t.description,
      Франчайзи: t.franchiseeName || t.franchiseeCity || "",
    }))

    const txSheet = XLSX.utils.json_to_sheet(exportData)
    setColWidths(txSheet, [14, 10, 14, 22, 40, 28])
    XLSX.utils.book_append_sheet(workbook, txSheet, "Транзакции")

    // === Лист: По категориям ===
    const categoryBreakdown: Record<string, { income: number; expense: number; count: number }> = {}
    transactions.forEach((t) => {
      const cat = getCategoryLabel(t.category)
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { income: 0, expense: 0, count: 0 }
      if (t.type === "income") categoryBreakdown[cat].income += t.amount
      else categoryBreakdown[cat].expense += t.amount
      categoryBreakdown[cat].count++
    })

    const catData = Object.entries(categoryBreakdown)
      .sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense))
      .map(([cat, d]) => ({
        Категория: cat,
        Доходы: d.income,
        Расходы: d.expense,
        Баланс: d.income - d.expense,
        Транзакций: d.count,
      }))

    const catSheet = XLSX.utils.json_to_sheet(catData)
    setColWidths(catSheet, [25, 15, 15, 15, 14])
    XLSX.utils.book_append_sheet(workbook, catSheet, "По категориям")

    // === Лист: ФОТ (фонд оплаты труда) ===
    const fotCategories = ["fot_animators", "fot_hosts", "fot_djs", "fot_admin", "fot"]
    const fotTransactions = transactions.filter((t) => t.type === "expense" && fotCategories.includes(t.category || ""))
    if (fotTransactions.length > 0) {
      const fotBreakdown: Record<string, number> = {}
      fotTransactions.forEach((t) => {
        const cat = getCategoryLabel(t.category)
        fotBreakdown[cat] = (fotBreakdown[cat] || 0) + t.amount
      })
      const totalFot = Object.values(fotBreakdown).reduce((s, v) => s + v, 0)

      const fotData = Object.entries(fotBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amount]) => ({
          "Категория ФОТ": cat,
          Сумма: amount,
          "Доля %": totalFot > 0 ? `${((amount / totalFot) * 100).toFixed(1)}%` : "0%",
        }))
      fotData.push({ "Категория ФОТ": "ИТОГО", Сумма: totalFot, "Доля %": "100%" })

      const fotSheet = XLSX.utils.json_to_sheet(fotData)
      setColWidths(fotSheet, [25, 15, 12])
      XLSX.utils.book_append_sheet(workbook, fotSheet, "ФОТ разбивка")
    }

    // === Лист: По месяцам ===
    const monthlyData: Record<string, { income: number; expense: number; count: number }> = {}
    transactions.forEach((t) => {
      const key = new Date(t.date).toLocaleDateString("ru-RU", { year: "numeric", month: "long" })
      if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0, count: 0 }
      if (t.type === "income") monthlyData[key].income += t.amount
      else monthlyData[key].expense += t.amount
      monthlyData[key].count++
    })

    const monthlyBreakdown = Object.entries(monthlyData).map(([month, d]) => ({
      Месяц: month,
      Доходы: d.income,
      Расходы: d.expense,
      Прибыль: d.income - d.expense,
      Маржа: d.income > 0 ? `${(((d.income - d.expense) / d.income) * 100).toFixed(1)}%` : "0%",
      Транзакций: d.count,
    }))

    const monthlySheet = XLSX.utils.json_to_sheet(monthlyBreakdown)
    setColWidths(monthlySheet, [22, 15, 15, 15, 12, 14])
    XLSX.utils.book_append_sheet(workbook, monthlySheet, "По месяцам")

    // === Лист: По дням ===
    const dailyData: Record<string, { income: number; expense: number; count: number }> = {}
    transactions.forEach((t) => {
      const key = new Date(t.date).toLocaleDateString("ru-RU")
      if (!dailyData[key]) dailyData[key] = { income: 0, expense: 0, count: 0 }
      if (t.type === "income") dailyData[key].income += t.amount
      else dailyData[key].expense += t.amount
      dailyData[key].count++
    })

    const dailyBreakdown = Object.entries(dailyData)
      .sort((a, b) => new Date(a[0].split(".").reverse().join("-")).getTime() - new Date(b[0].split(".").reverse().join("-")).getTime())
      .map(([day, d]) => ({
        Дата: day,
        Доходы: d.income,
        Расходы: d.expense,
        Прибыль: d.income - d.expense,
        Транзакций: d.count,
      }))

    const dailySheet = XLSX.utils.json_to_sheet(dailyBreakdown)
    setColWidths(dailySheet, [14, 15, 15, 15, 14])
    XLSX.utils.book_append_sheet(workbook, dailySheet, "По дням")

    // === Сохранение ===
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ERP_Отчет_${new Date().toISOString().split("T")[0]}.xlsx`
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

  const totalRevenue = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (Number.parseFloat(String(t.amount)) || 0), 0)

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (Number.parseFloat(String(t.amount)) || 0), 0)

  const totalFOT = filteredTransactions
    .filter((t) => t.type === "expense" && (t.category?.startsWith("fot") || t.category === "fot"))
    .reduce((sum, t) => sum + (Number.parseFloat(String(t.amount)) || 0), 0)

  // Progress dynamics — compare filtered period vs previous period of same length
  const prevPeriodTotals = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return null
    const from = new Date(filters.dateFrom)
    const to = new Date(filters.dateTo)
    const periodDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const prevTo = new Date(from)
    prevTo.setDate(prevTo.getDate() - 1)
    const prevFrom = new Date(prevTo)
    prevFrom.setDate(prevFrom.getDate() - periodDays + 1)

    const prevTx = transactions.filter((t) => {
      const d = new Date(t.date)
      return d >= prevFrom && d <= prevTo
    })

    const prevRevenue = prevTx.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0)
    const prevExpenses = prevTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0)
    const prevFOT = prevTx.filter((t) => t.type === "expense" && (t.category?.startsWith("fot") || t.category === "fot")).reduce((s, t) => s + (Number(t.amount) || 0), 0)
    const prevProfit = prevRevenue - prevExpenses
    return { revenue: prevRevenue, expenses: prevExpenses, fot: prevFOT, profit: prevProfit }
  }, [transactions, filters.dateFrom, filters.dateTo])

  const getDynamicPct = (current: number, prev: number | undefined) => {
    if (prev === undefined || prev === 0) return null
    return ((current - prev) / Math.abs(prev)) * 100
  }

  const DynamicBadge = ({ current, prev }: { current: number; prev: number | undefined }) => {
    const pct = getDynamicPct(current, prev)
    if (pct === null) return null
    const isUp = pct >= 0
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isUp ? "text-green-500" : "text-red-500"}`}>
        {isUp ? "+" : ""}{pct.toFixed(1)}% vs пред.
      </span>
    )
  }

  const isOwnPoint = role === "own_point" || user?.role === "own_point" || franchiseeData?.isOwnPoint
  const royaltyPercent = isOwnPoint ? 0 : Number(franchiseeData?.royaltyPercent) || 0
  const royaltyAmount = isOwnPoint ? 0 : Math.round(totalRevenue * (royaltyPercent / 100))
  const profit = totalRevenue - totalExpenses - royaltyAmount

  const isFranchiseeOrAdmin = role === "franchisee" || role === "admin"

  if (role === "uk" || role === "uk_employee" || role === "super_admin") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Финансы / ERP</h1>
            <p className="text-sm text-muted-foreground mt-1">Полный контроль финансовых показателей всей сети</p>
          </div>
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Финансовая Аналитика / ERP</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "admin"
              ? "Учет и аналитика транзакций вашей локации"
              : "Учет и аналитика транзакций ваших локаций"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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

      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-3 bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Период от</label>
          <input
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            max={filters.dateTo || ""}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary h-9"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Период до</label>
          <input
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            min={filters.dateFrom || ""}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary h-9"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Тип</label>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="bg-background w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="income">Доходы</SelectItem>
              <SelectItem value="expense">Расходы</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Категория</label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="bg-background w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              <SelectItem value="prepayment">Предоплата</SelectItem>
              <SelectItem value="postpayment">Постоплата</SelectItem>
              <SelectItem value="fot_animators">ФОТ Аниматоры</SelectItem>
              <SelectItem value="fot_hosts">ФОТ Ведущие</SelectItem>
              <SelectItem value="fot_djs">ФОТ Диджеи</SelectItem>
              <SelectItem value="fot_admin">ФОТ Админ</SelectItem>
              <SelectItem value="fot">ФОТ</SelectItem>
              <SelectItem value="rent">Аренда</SelectItem>
              <SelectItem value="marketing">Маркетинг</SelectItem>
              <SelectItem value="equipment">Оборудование</SelectItem>
              <SelectItem value="other_income">Прочий доход</SelectItem>
              <SelectItem value="other_expense">Прочий расход</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Сумма от</label>
          <input
            type="number"
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
            placeholder="0"
            className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary h-9 w-[100px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Сумма до</label>
          <input
            type="number"
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
            placeholder="999999"
            className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary h-9 w-[100px]"
          />
        </div>
        {(filters.dateFrom || filters.dateTo || filterType !== "all" || filterCategory !== "all" || amountMin || amountMax) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters({ ...filters, dateFrom: "", dateTo: "" })
              setFilterType("all")
              setFilterCategory("all")
              setAmountMin("")
              setAmountMax("")
            }}
            className="text-muted-foreground h-9"
          >
            <X size={14} className="mr-1" /> Сбросить
          </Button>
        )}
        <div className="sm:ml-auto">
          <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2 bg-transparent h-9">
            <Download size={16} />
            Экспорт Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Общий Доход</p>
          <p className="text-3xl font-bold text-green-500">{totalRevenue.toLocaleString()} ₽</p>
          {prevPeriodTotals ? <DynamicBadge current={totalRevenue} prev={prevPeriodTotals.revenue} /> : <p className="text-xs text-muted-foreground mt-2">Выручка за период</p>}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Общие Расходы</p>
          <p className="text-3xl font-bold text-orange-500">{totalExpenses.toLocaleString()} ₽</p>
          {prevPeriodTotals ? <DynamicBadge current={totalExpenses} prev={prevPeriodTotals.expenses} /> : <p className="text-xs text-muted-foreground mt-2">Все расходы</p>}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">ФОТ</p>
          <p className="text-3xl font-bold text-purple-500">{totalFOT.toLocaleString()} ₽</p>
          {prevPeriodTotals ? <DynamicBadge current={totalFOT} prev={prevPeriodTotals.fot} /> : <p className="text-xs text-muted-foreground mt-2">Аниматоры, ведущие, DJ</p>}
        </div>

        {!isOwnPoint && isFranchiseeOrAdmin && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-2">Роялти к оплате</p>
            <p className="text-3xl font-bold text-primary">{royaltyAmount.toLocaleString()} ₽</p>
            <p className="text-xs text-muted-foreground mt-2">{royaltyPercent}% от дохода</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Прибыль</p>
          <p className={`text-3xl font-bold ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {profit.toLocaleString()} ₽
          </p>
          {prevPeriodTotals ? <DynamicBadge current={profit} prev={prevPeriodTotals.profit} /> : <p className="text-xs text-muted-foreground mt-2">Доход - Расходы</p>}
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
              <Bar dataKey="profit" fill="#8B5CF6" name="Прибыль" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto shadow-sm">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
