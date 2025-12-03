/**
 * Deal Service
 * Handles deal operations including stage transitions and transaction creation
 */

import type { Deal } from "../types"
import { createTransactionFromDeal, generateIdempotencyKey, type TransactionResult } from "./transaction.service"
import { createActivity } from "./activity.service"
import { enqueueWebhook } from "./webhook.service"
import { emitSocketEvent } from "./socket.service"

export interface DealStageUpdateResult {
  deal: Deal
  transaction?: TransactionResult
  activities: any[]
}

/**
 * Update deal stage with automatic transaction creation
 * Implements idempotency and atomic operations
 */
export async function updateDealStage(
  dealId: string,
  newStage: string,
  userId: string,
  userEmail: string,
): Promise<DealStageUpdateResult> {
  console.log("[Deal Service] Updating deal stage:", dealId, newStage)

  // Fetch current deal data
  const deal = await getDealById(dealId)

  if (!deal) {
    throw new Error(`Deal not found: ${dealId}`)
  }

  // Update deal stage
  const updatedDeal: Deal = {
    ...deal,
    stage: newStage,
    updatedAt: new Date(),
  }

  // Save updated deal
  await saveDeal(updatedDeal)

  // Create activity log for stage change
  const stageActivity = await createActivity({
    dealId,
    type: "event",
    userId,
    userName: userEmail,
    content: `Стадия изменена на "${newStage}"`,
  })

  const activities = [stageActivity]

  let transactionResult: TransactionResult | undefined

  // Check if this stage requires transaction creation
  if (shouldCreateTransaction(newStage)) {
    console.log("[Deal Service] Stage requires transaction creation")

    try {
      // Generate idempotency key for this specific deal-stage combination
      const idempotencyKey = generateIdempotencyKey(dealId, newStage)

      // Create transaction (idempotent)
      transactionResult = await createTransactionFromDeal(updatedDeal, idempotencyKey)

      if (transactionResult.isNew) {
        console.log("[Deal Service] New transaction created:", transactionResult.transaction.id)

        // Log transaction creation activity
        const transactionActivity = await createActivity({
          dealId,
          type: "event",
          userId,
          userName: "Система",
          content: `Транзакция создана: ${transactionResult.transaction.id}`,
        })

        activities.push(transactionActivity)

        // Enqueue webhook for external systems (async)
        await enqueueWebhook({
          event: "deal.completed",
          data: {
            dealId,
            transactionId: transactionResult.transaction.id,
            stage: newStage,
            amount: transactionResult.transaction.totalRevenue,
          },
        })

        // Emit socket event for real-time updates
        await emitSocketEvent("transaction:created", {
          transaction: transactionResult.transaction,
          dealId,
        })
      } else {
        console.log("[Deal Service] Transaction already exists (idempotency), returning existing")
      }
    } catch (error) {
      console.error("[Deal Service] Error creating transaction:", error)

      // Log error activity
      const errorActivity = await createActivity({
        dealId,
        type: "event",
        userId,
        userName: "Система",
        content: `Ошибка создания транзакции: ${(error as Error).message}`,
      })

      activities.push(errorActivity)

      // Don't throw - stage was updated successfully even if transaction failed
      // This allows manual transaction creation later
    }
  }

  return {
    deal: updatedDeal,
    transaction: transactionResult,
    activities,
  }
}

/**
 * Determine if stage transition requires transaction creation
 */
function shouldCreateTransaction(stage: string): boolean {
  const transactionStages = ["Игра проведена", "Completed"]

  return transactionStages.includes(stage)
}

/**
 * Get deal by ID
 * In real implementation, this would query the database
 */
async function getDealById(id: string): Promise<Deal | null> {
  // Simulate database query
  // In real backend: SELECT * FROM deals WHERE id = $1

  // For frontend mock, return mock data or fetch from API
  return null // Replace with actual implementation
}

/**
 * Save deal to database
 * In real implementation, this would UPDATE the database
 */
async function saveDeal(deal: Deal): Promise<Deal> {
  // Simulate database update
  // In real backend: UPDATE deals SET ... WHERE id = $1 RETURNING *

  return deal
}
