/**
 * Calculation helpers for QuestLegends OS 2.0
 * All financial calculations are centralized here for consistency and testability
 */

export interface CalculationInputs {
  participants: number
  checkPerPerson: number
  animatorsCount: number
  animatorRate: number
  hostRate: number
  djRate: number
}

export interface CalculationResults {
  totalRevenue: number
  fot: number
  royalty: number
  netProfit: number
  expenses?: number
}

/**
 * Calculate total revenue from participants and check per person
 * Formula: participants × check_per_person
 */
export function calcTotalRevenue(participants: number, checkPerPerson: number): number {
  if (participants < 0 || checkPerPerson < 0) {
    throw new Error("Participants and check per person must be positive numbers")
  }
  return Math.round(participants * checkPerPerson)
}

/**
 * Calculate FOT (Fund of Time) - total personnel costs
 * Formula: (animators_count × animator_rate) + host_rate + dj_rate
 */
export function calcFOT(animatorsCount: number, animatorRate: number, hostRate: number, djRate: number): number {
  if (animatorsCount < 0 || animatorRate < 0 || hostRate < 0 || djRate < 0) {
    throw new Error("All rates must be positive numbers")
  }
  return Math.round(animatorsCount * animatorRate + hostRate + djRate)
}

/**
 * Calculate royalty amount (default 7% of total revenue)
 * Formula: total_revenue × royalty_percent
 */
export function calcRoyalty(totalRevenue: number, royaltyPercent = 0.07): number {
  if (totalRevenue < 0) {
    throw new Error("Total revenue must be a positive number")
  }
  if (royaltyPercent < 0 || royaltyPercent > 1) {
    throw new Error("Royalty percent must be between 0 and 1")
  }
  return Math.round(totalRevenue * royaltyPercent)
}

/**
 * Calculate net profit
 * Formula: total_revenue - royalty - fot - expenses
 */
export function calcNetProfit(totalRevenue: number, royalty: number, fot: number, expenses = 0): number {
  return Math.round(totalRevenue - royalty - fot - expenses)
}

/**
 * Calculate all metrics at once
 * Returns complete calculation results
 */
export function calculateAll(inputs: CalculationInputs, expenses = 0): CalculationResults {
  const totalRevenue = calcTotalRevenue(inputs.participants, inputs.checkPerPerson)
  const fot = calcFOT(inputs.animatorsCount, inputs.animatorRate, inputs.hostRate, inputs.djRate)
  const royalty = calcRoyalty(totalRevenue)
  const netProfit = calcNetProfit(totalRevenue, royalty, fot, expenses)

  return {
    totalRevenue,
    fot,
    royalty,
    netProfit,
    expenses,
  }
}

/**
 * Calculate average check per game
 */
export function calcAverageCheck(totalRevenue: number, gamesCount: number): number {
  if (gamesCount === 0) return 0
  return Math.round(totalRevenue / gamesCount)
}

/**
 * Calculate profit margin percentage
 */
export function calcProfitMargin(netProfit: number, totalRevenue: number): number {
  if (totalRevenue === 0) return 0
  return Math.round((netProfit / totalRevenue) * 10000) / 100 // 2 decimal places
}

/**
 * Create historical rates snapshot for transaction
 * This ensures historical data integrity when rates change
 */
export function createHistoricalRates(inputs: CalculationInputs): Record<string, any> {
  return {
    animator_rate: inputs.animatorRate,
    host_rate: inputs.hostRate,
    dj_rate: inputs.djRate,
    animators_count: inputs.animatorsCount,
    snapshot_date: new Date().toISOString(),
  }
}
