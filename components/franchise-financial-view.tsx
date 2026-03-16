"use client"

import { useState, useEffect, useMemo } from "react"
import { TrendingUp, TrendingDown, RussianRuble, Settings, X, Check, Download, Calendar, Building2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import * as XLSX from "xlsx"

interface FranchiseFinance {
  id: string
  name: string
  location: string
  revenue: number
  royaltyPercent: number
  royalty: number
  expenses: number
  profit: number
  completedGames: number
  cancelledGames: number
  cancelRate: number
  avgCheck: number
  status: "active" | "pending" | "inactive"
}

interface RawTransaction {
  id: string
  date: string
  type: "income" | "expense"
  amount: number
  description?: string
  category?: string
  franchiseeId?: string
  franchiseeName?: string
}

interface FranchiseFinancialViewProps {
  searchTerm?: string
}

export function FranchiseFinancialView({ searchTerm = "" }: FranchiseFinancialViewProps) {
  const [sortBy, setSortBy] = useState<"revenue" | "profit">("revenue")
  const [franchiseData, setFranchiseData] = useState<FranchiseFinance[]>([])
  const [allTransactions, setAllTransactions] = useState<RawTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const { user, getAuthHeaders } = useAuth()

  const [editingRoyalty, setEditingRoyalty] = useState<string | null>(null)
  const [editRoyaltyValue, setEditRoyaltyValue] = useState<number>(7)
  const [savingRoyalty, setSavingRoyalty] = useState(false)

  // Filters
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Previous period data for dynamics
  const [prevPeriodData, setPrevPeriodData] = useState<{ revenue: number; royalty: number; expenses: number; profit: number } | null>(null)

  useEffect(() => {
    loadFranchiseFinancials()
  }, [])

  // Compute previous period when date filters change
  useEffect(() => {
    if (dateFrom && dateTo && allTransactions.length > 0) {
      const from = new Date(dateFrom)
      const to = new Date(dateTo)
      const periodDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const prevTo = new Date(from)
      prevTo.setDate(prevTo.getDate() - 1)
      const prevFrom = new Date(prevTo)
      prevFrom.setDate(prevFrom.getDate() - periodDays + 1)

      const prevTx = allTransactions.filter((t) => {
        const d = new Date(t.date)
        const matchFranchise = selectedFranchiseId === "all" || t.franchiseeId === selectedFranchiseId
        return d >= prevFrom && d <= prevTo && matchFranchise
      })

      const prevRevenue = prevTx.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0)
      const prevExpenses = prevTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0)
      const prevRoyalty = Math.round(prevRevenue * 0.07)
      setPrevPeriodData({ revenue: prevRevenue, royalty: prevRoyalty, expenses: prevExpenses, profit: prevRevenue - prevExpenses })
    } else {
      setPrevPeriodData(null)
    }
  }, [dateFrom, dateTo, allTransactions, selectedFranchiseId])

  const loadFranchiseFinancials = async () => {
    try {
      setLoading(true)
      const headers = getAuthHeaders()
      const [franchisesRes, transactionsRes, expensesRes] = await Promise.all([
        fetch("/api/franchisees", { headers }),
        fetch("/api/transactions", { headers }),
        fetch("/api/expenses", { headers }),
      ])

      if (!franchisesRes.ok || !transactionsRes.ok || !expensesRes.ok) {
        throw new Error("Failed to load financial data")
      }

      const franchises = await franchisesRes.json()
      const transactionsData = await transactionsRes.json()
      const expenses = await expensesRes.json()

      const transactions: RawTransaction[] = Array.isArray(transactionsData) ? transactionsData : transactionsData.transactions || []
      setAllTransactions(transactions)

      const financialData = franchises.map((f: any) => {
        const franchiseeTransactions = transactions.filter((t: any) => t.franchiseeId === f.id)
        const franchiseeExpenses = expenses.filter((e: any) => e.franchiseeId === f.id)

        const revenue = franchiseeTransactions
          .filter((t: any) => t.type === "income")
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)
        const royaltyPercent = Number(f.royaltyPercent) || 0
        const royalty = Math.round(revenue * (royaltyPercent / 100))
        const expensesTotal = franchiseeExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
        const profit = revenue - royalty - expensesTotal

        const completedGames = Number(f.completedGames) || 0
        const cancelledGames = Number(f.cancelledGames) || 0
        const gamesRevenue = Number(f.gamesRevenue) || 0
        const cancelRate = completedGames > 0 ? Math.round((cancelledGames / completedGames) * 100) : 0
        const avgCheck = completedGames > 0 ? Math.round(gamesRevenue / completedGames) : 0

        return {
          id: f.id,
          name: f.name,
          location: f.city || f.location || "",
          revenue,
          royaltyPercent,
          royalty,
          expenses: expensesTotal,
          profit,
          completedGames,
          cancelledGames,
          cancelRate,
          avgCheck,
          status: "active" as const,
        }
      })

      setFranchiseData(financialData)
    } catch (error) {
      console.error("Error loading franchise financials:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRoyalty = async (franchiseeId: string) => {
    try {
      setSavingRoyalty(true)
      const response = await fetch(`/api/franchisees/${franchiseeId}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ royaltyPercent: editRoyaltyValue }),
      })

      if (response.ok) {
        setFranchiseData((prev) =>
          prev.map((f) => {
            if (f.id === franchiseeId) {
              const newRoyalty = Math.round(f.revenue * (editRoyaltyValue / 100))
              return { ...f, royaltyPercent: editRoyaltyValue, royalty: newRoyalty, profit: f.revenue - newRoyalty - f.expenses }
            }
            return f
          }),
        )
        setEditingRoyalty(null)
        await loadFranchiseFinancials()
      }
    } catch (error) {
      console.error("Error saving royalty:", error)
    } finally {
      setSavingRoyalty(false)
    }
  }

  const startEditingRoyalty = (franchisee: FranchiseFinance) => {
    setEditingRoyalty(franchisee.id)
    setEditRoyaltyValue(franchisee.royaltyPercent)
  }

  // Filter by franchise and date range
  const filteredFranchises = useMemo(() => {
    return franchiseData.filter((f) => {
      if (selectedFranchiseId !== "all" && f.id !== selectedFranchiseId) return false
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        f.name.toLowerCase().includes(searchLower) ||
        f.location.toLowerCase().includes(searchLower) ||
        f.revenue.toString().includes(searchTerm) ||
        f.profit.toString().includes(searchTerm)
      )
    })
  }, [franchiseData, selectedFranchiseId, searchTerm])

  // Recompute financials based on date filter using raw transactions
  const dateFilteredStats = useMemo(() => {
    if (!dateFrom && !dateTo) return null

    const fromDate = dateFrom ? new Date(dateFrom) : null
    const toDate = dateTo ? new Date(dateTo) : null

    const filteredTx = allTransactions.filter((t) => {
      const d = new Date(t.date)
      if (fromDate && d < fromDate) return false
      if (toDate && d > toDate) return false
      const matchFranchise = selectedFranchiseId === "all" || t.franchiseeId === selectedFranchiseId
      return matchFranchise
    })

    const revenue = filteredTx.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0)
    const expenses = filteredTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0)
    const royalty = Math.round(revenue * 0.07)
    const profit = revenue - expenses

    return { revenue, royalty, expenses, profit }
  }, [allTransactions, dateFrom, dateTo, selectedFranchiseId])

  const totalRevenue = dateFilteredStats?.revenue ?? filteredFranchises.reduce((sum, f) => sum + f.revenue, 0)
  const totalRoyalty = dateFilteredStats?.royalty ?? filteredFranchises.reduce((sum, f) => sum + f.royalty, 0)
  const totalExpenses = dateFilteredStats?.expenses ?? filteredFranchises.reduce((sum, f) => sum + f.expenses, 0)
  const totalProfit = dateFilteredStats?.profit ?? filteredFranchises.reduce((sum, f) => sum + f.profit, 0)

  const sorted = [...filteredFranchises].sort((a, b) => {
    if (sortBy === "revenue") return b.revenue - a.revenue
    return b.profit - a.profit
  })

  const canEditRoyalty = user?.role === "uk" || user?.role === "super_admin"

  // Dynamic percent change
  const getDynamic = (current: number, prev: number | undefined) => {
    if (!prev || prev === 0) return null
    const change = ((current - prev) / Math.abs(prev)) * 100
    return change
  }

  // Export franchise to Excel
  const exportFranchiseExcel = (franchise?: FranchiseFinance) => {
    const workbook = XLSX.utils.book_new()
    const setColWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
      ws["!cols"] = widths.map((w) => ({ wch: w }))
    }

    const targets = franchise ? [franchise] : sorted
    const label = franchise ? franchise.name : "Вся сеть"

    // Summary
    const summaryData = targets.map((f) => ({
      Франчайзи: f.name,
      Локация: f.location,
      Выручка: f.revenue,
      "Роялти %": f.royaltyPercent,
      "Роялти ₽": f.royalty,
      Расходы: f.expenses,
      Прибыль: f.profit,
      "Маржа %": f.revenue > 0 ? `${((f.profit / f.revenue) * 100).toFixed(1)}%` : "0%",
      Игры: f.completedGames,
      Отказы: f.cancelledGames,
      "Ср. чек": f.avgCheck,
    }))

    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    setColWidths(summarySheet, [25, 20, 15, 10, 15, 15, 15, 10, 10, 10, 12])
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Сводная")

    // Transactions for selected franchise(s)
    const franchiseIds = new Set(targets.map((f) => f.id))
    const txData = allTransactions
      .filter((t) => {
        if (!franchiseIds.has(t.franchiseeId || "")) return false
        if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false
        if (dateTo && new Date(t.date) > new Date(dateTo)) return false
        return true
      })
      .map((t) => ({
        Дата: new Date(t.date).toLocaleDateString("ru-RU"),
        Тип: t.type === "income" ? "Доход" : "Расход",
        Сумма: t.amount,
        Категория: t.category || "",
        Описание: t.description || "",
        Франчайзи: t.franchiseeName || "",
      }))

    if (txData.length > 0) {
      const txSheet = XLSX.utils.json_to_sheet(txData)
      setColWidths(txSheet, [14, 10, 14, 20, 40, 25])
      XLSX.utils.book_append_sheet(workbook, txSheet, "Транзакции")
    }

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    const dateStr = new Date().toISOString().split("T")[0]
    const periodStr = dateFrom && dateTo ? `_${dateFrom}_${dateTo}` : ""
    link.download = `ERP_${label.replace(/\s/g, "_")}${periodStr}_${dateStr}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const DynamicBadge = ({ current, prev, suffix = "₽" }: { current: number; prev: number | undefined; suffix?: string }) => {
    const change = getDynamic(current, prev)
    if (change === null) return null
    const isPositive = change >= 0
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium mt-1 ${isPositive ? "text-green-500" : "text-red-500"}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isPositive ? "+" : ""}{change.toFixed(1)}%
        <span className="text-muted-foreground ml-0.5">vs пред. период</span>
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Франшиза</label>
          <Select value={selectedFranchiseId} onValueChange={setSelectedFranchiseId}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Все франшизы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все франшизы</SelectItem>
              {franchiseData.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name} — {f.location}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> От</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo || ""}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary h-9"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> До</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || ""}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary h-9"
          />
        </div>
        {(dateFrom || dateTo || selectedFranchiseId !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDateFrom(""); setDateTo(""); setSelectedFranchiseId("all") }}
            className="text-muted-foreground h-9"
          >
            <X className="w-4 h-4 mr-1" /> Сбросить
          </Button>
        )}
        <div className="sm:ml-auto">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent h-9" onClick={() => {
            const selected = selectedFranchiseId !== "all" ? franchiseData.find(f => f.id === selectedFranchiseId) : undefined
            exportFranchiseExcel(selected)
          }}>
            <Download className="w-4 h-4" />
            Экспорт Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Загрузка финансовых данных...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards with dynamics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Общая Выручка</p>
                <RussianRuble className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-500">{totalRevenue.toLocaleString()} ₽</p>
              <DynamicBadge current={totalRevenue} prev={prevPeriodData?.revenue} />
              {!prevPeriodData && <p className="text-xs text-muted-foreground mt-2">{filteredFranchises.length} франчайзи</p>}
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Роялти Сеть</p>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">{totalRoyalty.toLocaleString()} ₽</p>
              <DynamicBadge current={totalRoyalty} prev={prevPeriodData?.royalty} />
              {!prevPeriodData && (
                <p className="text-xs text-muted-foreground mt-2">
                  {totalRevenue > 0 ? ((totalRoyalty / totalRevenue) * 100).toFixed(1) : 0}% от выручки
                </p>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Общие Расходы</p>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-500">{totalExpenses.toLocaleString()} ₽</p>
              <DynamicBadge current={totalExpenses} prev={prevPeriodData?.expenses} />
              {!prevPeriodData && (
                <p className="text-xs text-muted-foreground mt-2">
                  {totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0}% от выручки
                </p>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Общая Прибыль</p>
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">Чистая</span>
              </div>
              <p className="text-2xl font-bold text-primary">{totalProfit.toLocaleString()} ₽</p>
              <DynamicBadge current={totalProfit} prev={prevPeriodData?.profit} />
              {!prevPeriodData && (
                <p className="text-xs text-muted-foreground mt-2">
                  {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% маржа
                </p>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
            <div className="p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedFranchiseId !== "all"
                    ? `Показатели: ${franchiseData.find(f => f.id === selectedFranchiseId)?.name || ""}`
                    : "Финансовые показатели по франчайзи"}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortBy("revenue")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      sortBy === "revenue"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    По выручке
                  </button>
                  <button
                    onClick={() => setSortBy("profit")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      sortBy === "profit"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    По прибыли
                  </button>
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-xs font-semibold text-muted-foreground">Франчайзи</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Локация</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Выручка</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Роялти %</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Роялти ₽</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Расходы</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Прибыль</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Игры</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Отказы %</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Ср. чек</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Экспорт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((franchise) => (
                  <TableRow key={franchise.id} className="border-b border-border/50 hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">{franchise.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{franchise.location}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-green-500">
                      {franchise.revenue.toLocaleString()} ₽
                    </TableCell>
                    <TableCell className="text-right">
                      {editingRoyalty === franchise.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editRoyaltyValue}
                            onChange={(e) => setEditRoyaltyValue(Number(e.target.value))}
                            min={0}
                            max={100}
                            step={0.5}
                            className="w-16 h-7 text-sm text-right bg-background border border-border rounded px-2"
                            autoFocus
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          <button
                            onClick={() => handleSaveRoyalty(franchise.id)}
                            disabled={savingRoyalty}
                            className="p-1 text-green-500 hover:bg-green-500/10 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingRoyalty(null)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-sm font-medium text-primary">{franchise.royaltyPercent}%</span>
                          {canEditRoyalty && (
                            <button
                              onClick={() => startEditingRoyalty(franchise)}
                              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                              title="Изменить роялти"
                            >
                              <Settings className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-primary">
                      {franchise.royalty.toLocaleString()} ₽
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-red-500">
                      {franchise.expenses.toLocaleString()} ₽
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-primary">
                      {franchise.profit.toLocaleString()} ₽
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {franchise.completedGames}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium ${
                        franchise.cancelRate > 30
                          ? "text-red-600"
                          : franchise.cancelRate > 15
                            ? "text-orange-500"
                            : "text-green-600"
                      }`}>
                        {franchise.cancelRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-muted-foreground">
                      {franchise.avgCheck.toLocaleString()} ₽
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => exportFranchiseExcel(franchise)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        title={`Экспорт ${franchise.name}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {sorted.length === 0 && (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground">Нет франчайзи по данным критериям поиска</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
