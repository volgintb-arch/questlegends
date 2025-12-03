/**
 * Analytics Service
 * Implements optimized SQL queries for financial analytics
 */

import { calcAverageCheck, calcProfitMargin } from "../calculations"
import type { Transaction, Expense } from "../types"

export interface AnalyticsFilters {
  locationId?: string
  startDate: Date
  endDate: Date
}

/**
 * Calculate P&L using optimized SQL aggregation
 * In production: Single SQL query with JOINs and aggregations
 */
export async function calculatePnL(filters: AnalyticsFilters) {
  console.log("[Analytics Service] Calculating P&L:", filters)

  // In real backend, this would be a single optimized SQL query:
  /*
  SELECT
    SUM(t.total_revenue) as total_revenue,
    SUM(t.royalty_amount) as total_royalty,
    SUM(t.fot_calculation) as total_fot,
    COUNT(*) as games_count,
    (SELECT SUM(e.amount) 
     FROM expenses e 
     WHERE e.location_id = t.location_id 
       AND e.date BETWEEN $2 AND $3
       AND e.status = 'approved') as total_expenses
  FROM transactions t
  WHERE t.location_id = $1
    AND t.date BETWEEN $2 AND $3
    AND t.status = 'completed'
  GROUP BY t.location_id
  */

  // For demo, simulate the calculation
  const transactions = await getTransactions(filters)
  const expenses = await getExpenses(filters)

  const totalRevenue = transactions.reduce((sum, t) => sum + t.totalRevenue, 0)
  const totalRoyalty = transactions.reduce((sum, t) => sum + t.royaltyAmount, 0)
  const totalFOT = transactions.reduce((sum, t) => sum + t.fotCalculation, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const gamesCount = transactions.length

  const netProfit = totalRevenue - totalRoyalty - totalFOT - totalExpenses
  const margin = calcProfitMargin(netProfit, totalRevenue)
  const avgCheck = calcAverageCheck(totalRevenue, gamesCount)

  return {
    totalRevenue,
    totalRoyalty,
    totalFOT,
    totalExpenses,
    netProfit,
    margin,
    gamesCount,
    avgCheck,
    period: {
      startDate: filters.startDate.toISOString(),
      endDate: filters.endDate.toISOString(),
    },
  }
}

/**
 * Get revenue analytics with time series grouping
 * Supports grouping by day, week, or month
 */
export async function calculateRevenueAnalytics(filters: AnalyticsFilters, groupBy: "day" | "week" | "month" = "day") {
  console.log("[Analytics Service] Calculating revenue analytics:", filters, groupBy)

  // In real backend:
  /*
  SELECT
    date_trunc('${groupBy}', t.date) as period,
    SUM(t.total_revenue) as revenue,
    SUM(t.fot_calculation) as fot,
    (SELECT SUM(e.amount) 
     FROM expenses e 
     WHERE e.location_id = t.location_id 
       AND date_trunc('${groupBy}', e.date) = date_trunc('${groupBy}', t.date)) as expenses
  FROM transactions t
  WHERE t.location_id = $1
    AND t.date BETWEEN $2 AND $3
  GROUP BY period
  ORDER BY period
  */

  const transactions = await getTransactions(filters)
  const expenses = await getExpenses(filters)

  // Group data by period
  const grouped = new Map<string, { revenue: number; fot: number; expenses: number }>()

  transactions.forEach((t) => {
    const key = formatDateByGroup(t.date, groupBy)
    const existing = grouped.get(key) || { revenue: 0, fot: 0, expenses: 0 }
    existing.revenue += t.totalRevenue
    existing.fot += t.fotCalculation
    grouped.set(key, existing)
  })

  expenses.forEach((e) => {
    const key = formatDateByGroup(e.date, groupBy)
    const existing = grouped.get(key) || { revenue: 0, fot: 0, expenses: 0 }
    existing.expenses += e.amount
    grouped.set(key, existing)
  })

  // Convert to chart data
  const chartData = Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      expenses: data.expenses,
      fot: data.fot,
      profit: data.revenue - data.expenses - data.fot,
    }))

  const total = chartData.reduce((sum, d) => sum + d.revenue, 0)
  const growth = calculateGrowth(chartData)

  return {
    chartData,
    total,
    growth,
  }
}

/**
 * Compare franchisees performance
 * Optimized for UK role - shows all franchisees ranked by revenue
 */
export async function compareFranchisees(period: "week" | "month" | "quarter" | "year" = "month") {
  console.log("[Analytics Service] Comparing franchisees:", period)

  const { startDate, endDate } = getPeriodDates(period)

  // In real backend:
  /*
  SELECT
    f.id,
    f.name,
    f.location,
    SUM(t.total_revenue) as revenue,
    SUM(e.amount) as expenses,
    SUM(t.total_revenue) - SUM(t.royalty_amount) - SUM(t.fot_calculation) - SUM(e.amount) as net_profit,
    COUNT(t.id) as games_count
  FROM franchisees f
  LEFT JOIN transactions t ON t.location_id = f.id AND t.date BETWEEN $1 AND $2
  LEFT JOIN expenses e ON e.location_id = f.id AND e.date BETWEEN $1 AND $2
  WHERE f.is_active = true
  GROUP BY f.id
  ORDER BY revenue DESC
  */

  // For demo, return mock data
  const franchisees = [
    {
      id: "loc-1",
      name: "QuestLegends Москва Центр",
      location: "Москва",
      revenue: 1500000,
      expenses: 450000,
      netProfit: 645000,
      margin: 43,
      gamesCount: 120,
    },
    {
      id: "loc-2",
      name: "QuestLegends СПб Невский",
      location: "Санкт-Петербург",
      revenue: 1200000,
      expenses: 380000,
      netProfit: 520000,
      margin: 43.3,
      gamesCount: 95,
    },
    {
      id: "loc-3",
      name: "QuestLegends Казань Баумана",
      location: "Казань",
      revenue: 950000,
      expenses: 310000,
      netProfit: 407000,
      margin: 42.8,
      gamesCount: 78,
    },
  ]

  return {
    franchisees,
    bestFranchisee: franchisees[0],
  }
}

/**
 * Helper: Get transactions for filters
 */
async function getTransactions(filters: AnalyticsFilters): Promise<Transaction[]> {
  // Mock implementation - would be database query in production
  return []
}

/**
 * Helper: Get expenses for filters
 */
async function getExpenses(filters: AnalyticsFilters): Promise<Expense[]> {
  // Mock implementation - would be database query in production
  return []
}

/**
 * Helper: Format date based on grouping
 */
function formatDateByGroup(date: Date, groupBy: "day" | "week" | "month"): string {
  const d = new Date(date)

  if (groupBy === "day") {
    return d.toISOString().split("T")[0]
  }

  if (groupBy === "week") {
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    return weekStart.toISOString().split("T")[0]
  }

  if (groupBy === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  }

  return d.toISOString().split("T")[0]
}

/**
 * Helper: Calculate growth percentage
 */
function calculateGrowth(chartData: any[]): number {
  if (chartData.length < 2) return 0

  const first = chartData[0].revenue
  const last = chartData[chartData.length - 1].revenue

  if (first === 0) return 0

  return Math.round(((last - first) / first) * 100)
}

/**
 * Helper: Get date range for period
 */
function getPeriodDates(period: "week" | "month" | "quarter" | "year"): {
  startDate: Date
  endDate: Date
} {
  const endDate = new Date()
  const startDate = new Date()

  switch (period) {
    case "week":
      startDate.setDate(endDate.getDate() - 7)
      break
    case "month":
      startDate.setMonth(endDate.getMonth() - 1)
      break
    case "quarter":
      startDate.setMonth(endDate.getMonth() - 3)
      break
    case "year":
      startDate.setFullYear(endDate.getFullYear() - 1)
      break
  }

  return { startDate, endDate }
}
