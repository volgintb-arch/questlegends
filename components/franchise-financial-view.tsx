"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, DollarSign, Settings, X, Check } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/contexts/auth-context"

interface FranchiseFinance {
  id: string
  name: string
  location: string
  revenue: number
  royaltyPercent: number
  royalty: number
  expenses: number
  profit: number
  status: "active" | "pending" | "inactive"
}

interface FranchiseFinancialViewProps {
  searchTerm?: string
}

export function FranchiseFinancialView({ searchTerm = "" }: FranchiseFinancialViewProps) {
  const [sortBy, setSortBy] = useState<"revenue" | "profit">("revenue")
  const [franchiseData, setFranchiseData] = useState<FranchiseFinance[]>([])
  const [loading, setLoading] = useState(true)
  const { user, getAuthHeaders } = useAuth()

  const [editingRoyalty, setEditingRoyalty] = useState<string | null>(null)
  const [editRoyaltyValue, setEditRoyaltyValue] = useState<number>(7)
  const [savingRoyalty, setSavingRoyalty] = useState(false)

  useEffect(() => {
    loadFranchiseFinancials()
  }, [])

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

      const transactions = Array.isArray(transactionsData) ? transactionsData : transactionsData.transactions || []

      const financialData = franchises.map((f: any) => {
        const franchiseeTransactions = transactions.filter((t: any) => t.franchiseeId === f.id)
        const franchiseeExpenses = expenses.filter((e: any) => e.franchiseeId === f.id)

        const revenue = franchiseeTransactions
          .filter((t: any) => t.type === "income")
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)
        const royaltyPercent = f.royaltyPercent || 7
        const royalty = Math.round(revenue * (royaltyPercent / 100))
        const expensesTotal = franchiseeExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
        const profit = revenue - royalty - expensesTotal

        return {
          id: f.id,
          name: f.name,
          location: f.city || f.location || "",
          revenue,
          royaltyPercent,
          royalty,
          expenses: expensesTotal,
          profit,
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
      console.log("[v0] Saving royalty:", franchiseeId, editRoyaltyValue)

      const response = await fetch(`/api/franchisees/${franchiseeId}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ royaltyPercent: editRoyaltyValue }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Royalty saved successfully:", result)

        // Update local state
        setFranchiseData((prev) =>
          prev.map((f) => {
            if (f.id === franchiseeId) {
              const newRoyalty = Math.round(f.revenue * (editRoyaltyValue / 100))
              return {
                ...f,
                royaltyPercent: editRoyaltyValue,
                royalty: newRoyalty,
                profit: f.revenue - newRoyalty - f.expenses,
              }
            }
            return f
          }),
        )
        setEditingRoyalty(null)

        await loadFranchiseFinancials()
      } else {
        console.error("[v0] Failed to save royalty:", await response.text())
      }
    } catch (error) {
      console.error("[v0] Error saving royalty:", error)
    } finally {
      setSavingRoyalty(false)
    }
  }

  const startEditingRoyalty = (franchisee: FranchiseFinance) => {
    setEditingRoyalty(franchisee.id)
    setEditRoyaltyValue(franchisee.royaltyPercent)
  }

  const filteredFranchises = franchiseData.filter((f) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      f.name.toLowerCase().includes(searchLower) ||
      f.location.toLowerCase().includes(searchLower) ||
      f.revenue.toString().includes(searchTerm) ||
      f.profit.toString().includes(searchTerm)
    )
  })

  const totalRevenue = filteredFranchises.reduce((sum, f) => sum + f.revenue, 0)
  const totalRoyalty = filteredFranchises.reduce((sum, f) => sum + f.royalty, 0)
  const totalExpenses = filteredFranchises.reduce((sum, f) => sum + f.expenses, 0)
  const totalProfit = filteredFranchises.reduce((sum, f) => sum + f.profit, 0)

  const sorted = [...filteredFranchises].sort((a, b) => {
    if (sortBy === "revenue") return b.revenue - a.revenue
    return b.profit - a.profit
  })

  console.log("[v0] FranchiseFinancialView: Sorting by", sortBy, "Franchises count:", sorted.length)
  if (sorted.length > 0) {
    console.log(
      "[v0] First franchise:",
      sorted[0].name,
      sortBy === "revenue" ? `Revenue: ${sorted[0].revenue}` : `Profit: ${sorted[0].profit}`,
    )
  }

  const canEditRoyalty = user?.role === "uk" || user?.role === "super_admin"

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Загрузка финансовых данных...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Общая Выручка</p>
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-500">{totalRevenue.toLocaleString()} ₽</p>
              <p className="text-xs text-muted-foreground mt-2">{filteredFranchises.length} франчайзи</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Роялти Сеть</p>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-500">{totalRoyalty.toLocaleString()} ₽</p>
              <p className="text-xs text-muted-foreground mt-2">
                {totalRevenue > 0 ? ((totalRoyalty / totalRevenue) * 100).toFixed(1) : 0}% от выручки
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Общие Расходы</p>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-500">{totalExpenses.toLocaleString()} ₽</p>
              <p className="text-xs text-muted-foreground mt-2">
                {totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0}% от выручки
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Общая Прибыль</p>
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">Чистая</span>
              </div>
              <p className="text-2xl font-bold text-primary">{totalProfit.toLocaleString()} ₽</p>
              <p className="text-xs text-muted-foreground mt-2">
                {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% маржа
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Финансовые показатели по франчайзи</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      console.log("[v0] Sorting by revenue")
                      setSortBy("revenue")
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      sortBy === "revenue"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {sortBy === "revenue" && "✓ "}По выручке
                  </button>
                  <button
                    onClick={() => {
                      console.log("[v0] Sorting by profit")
                      setSortBy("profit")
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      sortBy === "profit"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {sortBy === "profit" && "✓ "}По прибыли
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
                  <TableHead className="text-xs font-semibold text-muted-foreground">Статус</TableHead>
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
                          <span className="text-sm font-medium text-blue-500">{franchise.royaltyPercent}%</span>
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
                    <TableCell className="text-right text-sm font-medium text-blue-500">
                      {franchise.royalty.toLocaleString()} ₽
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-red-500">
                      {franchise.expenses.toLocaleString()} ₽
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-primary">
                      {franchise.profit.toLocaleString()} ₽
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          franchise.status === "active"
                            ? "bg-green-500/20 text-green-600"
                            : franchise.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-600"
                              : "bg-red-500/20 text-red-600"
                        }`}
                      >
                        {franchise.status === "active"
                          ? "Активна"
                          : franchise.status === "pending"
                            ? "Ожидание"
                            : "Неактивна"}
                      </span>
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
