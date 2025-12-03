/**
 * Transaction Service
 * Handles creation and management of transactions with idempotency support
 */

import { calculateAll, createHistoricalRates, type CalculationInputs } from "../calculations"
import type { Deal, Transaction } from "../types"

export interface CreateTransactionInput {
  dealId: string
  locationId: string
  date: Date
  participantsCount: number
  checkPerPerson: number
  animatorsCount: number
  animatorRate: number
  hostRate: number
  djRate: number
  amoDealId?: string
}

export interface TransactionResult {
  transaction: Transaction
  isNew: boolean
}

/**
 * Generate idempotency key from deal ID and stage transition
 * This ensures the same deal can only create one transaction
 */
export function generateIdempotencyKey(dealId: string, stage: string): string {
  return `deal-${dealId}-stage-${stage}-${Date.now()}`
}

/**
 * Create transaction from deal data
 * Implements idempotency to prevent duplicate transactions
 */
export async function createTransactionFromDeal(deal: Deal, idempotencyKey?: string): Promise<TransactionResult> {
  // Validate required fields
  if (!deal.participants || !deal.checkPerPerson) {
    throw new Error("Missing required fields: participants and checkPerPerson")
  }

  // Prepare calculation inputs
  const inputs: CalculationInputs = {
    participants: deal.participants,
    checkPerPerson: deal.checkPerPerson,
    animatorsCount: deal.animatorsCount || 0,
    animatorRate: deal.animatorRate || 0,
    hostRate: deal.hostRate || 0,
    djRate: deal.djRate || 0,
  }

  // Calculate all financial metrics
  const calculations = calculateAll(inputs)

  // Create historical rates snapshot
  const historicalRates = createHistoricalRates(inputs)

  // Generate idempotency key if not provided
  const finalIdempotencyKey = idempotencyKey || generateIdempotencyKey(deal.id, "completed")

  // Prepare transaction data
  const transactionData: Partial<Transaction> = {
    date: deal.gameDate || new Date(),
    dealId: deal.id,
    locationId: deal.locationId,
    amoDealId: deal.amoDealId,

    // Main parameters
    participantsCount: deal.participants,
    checkPerPerson: deal.checkPerPerson,

    // Calculation fields
    animatorsCount: deal.animatorsCount || 0,
    animatorRate: deal.animatorRate || 0,
    hostRate: deal.hostRate || 0,
    djRate: deal.djRate || 0,

    // Calculated totals
    totalRevenue: calculations.totalRevenue,
    royaltyAmount: calculations.royalty,
    fotCalculation: calculations.fot,

    // Historical snapshot for data integrity
    historicalRates: historicalRates as any,

    // Idempotency
    idempotencyKey: finalIdempotencyKey,

    status: "completed",
  }

  try {
    // In real backend, this would be a database INSERT with UNIQUE constraint on idempotency_key
    // For now, simulate the check
    const existingTransaction = await checkExistingTransaction(finalIdempotencyKey)

    if (existingTransaction) {
      console.log("[Transaction Service] Idempotency: Transaction already exists", finalIdempotencyKey)
      return {
        transaction: existingTransaction,
        isNew: false,
      }
    }

    // Create new transaction
    const newTransaction = await saveTransaction(transactionData)

    console.log("[Transaction Service] Created new transaction:", newTransaction.id)

    return {
      transaction: newTransaction,
      isNew: true,
    }
  } catch (error: any) {
    // Handle unique constraint violation (idempotency)
    if (error.code === "23505" || error.message?.includes("duplicate")) {
      console.log("[Transaction Service] Caught duplicate transaction, fetching existing")
      const existingTransaction = await checkExistingTransaction(finalIdempotencyKey)

      if (existingTransaction) {
        return {
          transaction: existingTransaction,
          isNew: false,
        }
      }
    }

    throw error
  }
}

/**
 * Check if transaction with given idempotency key already exists
 * In real implementation, this would query the database
 */
async function checkExistingTransaction(idempotencyKey: string): Promise<Transaction | null> {
  // Simulate database check
  // In real backend: SELECT * FROM transactions WHERE idempotency_key = $1

  // For frontend mock, check localStorage or return null
  const mockTransactions = getMockTransactions()
  return mockTransactions.find((t) => t.idempotencyKey === idempotencyKey) || null
}

/**
 * Save transaction to database
 * In real implementation, this would INSERT into database
 */
async function saveTransaction(data: Partial<Transaction>): Promise<Transaction> {
  // Generate ID
  const id = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const transaction: Transaction = {
    id,
    date: data.date || new Date(),
    dealId: data.dealId!,
    locationId: data.locationId!,
    amoDealId: data.amoDealId,
    participantsCount: data.participantsCount!,
    checkPerPerson: data.checkPerPerson!,
    animatorsCount: data.animatorsCount!,
    animatorRate: data.animatorRate!,
    hostRate: data.hostRate!,
    djRate: data.djRate!,
    totalRevenue: data.totalRevenue!,
    royaltyAmount: data.royaltyAmount!,
    fotCalculation: data.fotCalculation!,
    historicalRates: data.historicalRates,
    idempotencyKey: data.idempotencyKey!,
    status: data.status || "completed",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Simulate database insert
  // In real backend: INSERT INTO transactions (...) VALUES (...) RETURNING *

  // For frontend mock, save to localStorage
  const mockTransactions = getMockTransactions()
  mockTransactions.push(transaction)
  saveMockTransactions(mockTransactions)

  return transaction
}

/**
 * Mock transaction storage (for frontend testing)
 * In production, this would be handled by backend database
 */
function getMockTransactions(): Transaction[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem("mock_transactions")
  return stored ? JSON.parse(stored) : []
}

function saveMockTransactions(transactions: Transaction[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem("mock_transactions", JSON.stringify(transactions))
}

/**
 * Validate transaction data before creation
 */
export function validateTransactionData(data: CreateTransactionInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.dealId) errors.push("dealId is required")
  if (!data.locationId) errors.push("locationId is required")
  if (data.participantsCount <= 0) errors.push("participantsCount must be positive")
  if (data.checkPerPerson <= 0) errors.push("checkPerPerson must be positive")
  if (data.animatorsCount < 0) errors.push("animatorsCount must be non-negative")
  if (data.animatorRate < 0) errors.push("animatorRate must be non-negative")
  if (data.hostRate < 0) errors.push("hostRate must be non-negative")
  if (data.djRate < 0) errors.push("djRate must be non-negative")

  return {
    valid: errors.length === 0,
    errors,
  }
}
