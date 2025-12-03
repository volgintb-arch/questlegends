/**
 * Analytics API
 * Optimized endpoints for financial and operational analytics
 */

import { api } from "./client"

export interface PnLResult {
  totalRevenue: number
  totalRoyalty: number
  totalFOT: number
  totalExpenses: number
  netProfit: number
  margin: number
  gamesCount: number
  avgCheck: number
  period: {
    startDate: string
    endDate: string
  }
}

export interface RevenueAnalytics {
  chartData: Array<{
    date: string
    revenue: number
    expenses: number
    fot: number
    profit: number
  }>
  total: number
  growth: number
}

export interface FranchiseeComparison {
  franchisees: Array<{
    id: string
    name: string
    location: string
    revenue: number
    expenses: number
    netProfit: number
    margin: number
    gamesCount: number
  }>
  bestFranchisee: {
    id: string
    name: string
    revenue: number
  }
}

export const analyticsApi = {
  /**
   * Get P&L (Profit & Loss) report
   * Uses optimized SQL aggregation
   */
  getPnL: (locationId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({
      ...(locationId && { locationId }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    })
    return api.get<PnLResult>(`/analytics/pnl?${params}`)
  },

  /**
   * Get revenue analytics with time series data
   * Supports grouping by day, week, month
   */
  getRevenue: (locationId?: string, startDate?: string, endDate?: string, groupBy = "day") => {
    const params = new URLSearchParams({
      ...(locationId && { locationId }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      groupBy,
    })
    return api.get<RevenueAnalytics>(`/analytics/revenue?${params}`)
  },

  /**
   * Get expenses breakdown by category
   */
  getExpenses: (locationId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({
      ...(locationId && { locationId }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    })
    return api.get<{
      byCategory: Array<{ category: string; amount: number }>
      total: number
    }>(`/analytics/expenses?${params}`)
  },

  /**
   * Compare franchisees performance (UK only)
   */
  compareFranchisees: (period = "month") => {
    return api.get<FranchiseeComparison>(`/analytics/franchisee-comparison?period=${period}`)
  },

  /**
   * Get best performing franchisee (UK only)
   */
  getBestFranchisee: (period = "month") => {
    return api.get<{
      id: string
      name: string
      location: string
      totalRevenue: number
      gamesCount: number
      avgCheck: number
    }>(`/analytics/best-franchisee?period=${period}`)
  },

  /**
   * Get dashboard metrics
   */
  getDashboard: (role: string, locationId?: string, period = "month") => {
    const params = new URLSearchParams({
      role,
      period,
      ...(locationId && { locationId }),
    })
    return api.get<{
      totalRevenue: number
      totalExpenses: number
      netProfit: number
      gamesCount: number
      franchiseeCount?: number
      topFranchisee?: { id: string; name: string; revenue: number }
    }>(`/analytics/dashboard?${params}`)
  },
}
