"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface FranchiseFinance {
  id: string
  name: string
  location: string
  revenue: number
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

  const franchiseData: FranchiseFinance[] = [
    {
      id: "F-001",
      name: "Москва-Юг",
      location: "Москва",
      revenue: 450000,
      royalty: 45000,
      expenses: 120000,
      profit: 285000,
      status: "active",
    },
    {
      id: "F-002",
      name: "СПб-Север",
      location: "Санкт-Петербург",
      revenue: 380000,
      royalty: 38000,
      expenses: 95000,
      profit: 247000,
      status: "active",
    },
    {
      id: "F-003",
      name: "Казань",
      location: "Казань",
      revenue: 320000,
      royalty: 32000,
      expenses: 85000,
      profit: 203000,
      status: "active",
    },
    {
      id: "F-004",
      name: "Екатеринбург",
      location: "Екатеринбург",
      revenue: 290000,
      royalty: 29000,
      expenses: 75000,
      profit: 186000,
      status: "active",
    },
    {
      id: "F-005",
      name: "Новосибирск",
      location: "Новосибирск",
      revenue: 250000,
      royalty: 25000,
      expenses: 60000,
      profit: 165000,
      status: "pending",
    },
  ]

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

  return (
    <div className="space-y-6">
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
                onClick={() => setSortBy("revenue")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  sortBy === "revenue"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                По выручке
              </button>
              <button
                onClick={() => setSortBy("profit")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  sortBy === "profit"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
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
              <TableHead className="text-right text-xs font-semibold text-muted-foreground">Роялти</TableHead>
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
    </div>
  )
}
