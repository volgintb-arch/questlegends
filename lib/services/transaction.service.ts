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
  return `deal-${dealId}-stage-${stage}`
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

  // Synchronous check+save to ensure atomicity (prevents race conditions)
  const existingTransaction = checkExistingTransaction(finalIdempotencyKey)

  if (existingTransaction) {
    console.log("[Transaction Service] Idempotency: Transaction already exists", finalIdempotencyKey)
    return {
      transaction: existingTransaction,
      isNew: false,
    }
  }

  // Create new transaction
  const newTransaction = saveTransaction(transactionData)

  console.log("[Transaction Service] Created new transaction:", newTransaction.id)

  return {
    transaction: newTransaction,
    isNew: true,
  }
}

/**
 * In-memory transaction store — works in both browser and Node.js (test environment).
 * In production this would be a database with a UNIQUE constraint on idempotency_key.
 * Keyed by idempotency key for O(1) lookup.
 */
const mockTransactionStore = new Map<string, Transaction>()

/**
 * Check if transaction with given idempotency key already exists.
 * Synchronous to ensure atomicity with saveTransaction (prevents race conditions).
 * In real implementation: SELECT * FROM transactions WHERE idempotency_key = $1
 */
function checkExistingTransaction(idempotencyKey: string): Transaction | null {
  return mockTransactionStore.get(idempotencyKey) ?? null
}

/**
 * Save transaction to store.
 * Synchronous to ensure atomicity with checkExistingTransaction (prevents race conditions).
 * In real implementation: INSERT INTO transactions (...) VALUES (...) RETURNING *
 */
function saveTransaction(data: Partial<Transaction>): Transaction {
  const id = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const transaction: Transaction = {
    id,
    date: data.date || new Date(),
    dealId: data.dealId,
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

  mockTransactionStore.set(transaction.idempotencyKey, transaction)

  return transaction
}

/**
 * Clear mock store — used in tests via beforeEach.
 */
export function clearMockTransactionStore(): void {
  mockTransactionStore.clear()
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
