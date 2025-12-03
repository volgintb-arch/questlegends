/**
 * Transaction Service Tests
 * Tests for idempotency and concurrent request handling
 */

import { describe, it, expect, beforeEach } from "@jest/globals"
import { createTransactionFromDeal, generateIdempotencyKey } from "./transaction.service"
import type { Deal } from "../types"

describe("Transaction Service - Idempotency", () => {
  const mockDeal: Deal = {
    id: "deal-123",
    title: "Test Game",
    locationId: "loc-456",
    stage: "Игра проведена",
    participants: 10,
    checkPerPerson: 5000,
    animatorsCount: 2,
    animatorRate: 3000,
    hostRate: 5000,
    djRate: 4000,
    gameDate: new Date("2025-01-15"),
    amount: 50000,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    // Clear mock storage
    if (typeof window !== "undefined") {
      localStorage.removeItem("mock_transactions")
    }
  })

  it("should create transaction on first call", async () => {
    const result = await createTransactionFromDeal(mockDeal)

    expect(result.isNew).toBe(true)
    expect(result.transaction).toBeDefined()
    expect(result.transaction.totalRevenue).toBe(50000)
    expect(result.transaction.fotCalculation).toBe(15000)
    expect(result.transaction.royaltyAmount).toBe(3500)
  })

  it("should return existing transaction on duplicate call (idempotency)", async () => {
    const idempotencyKey = generateIdempotencyKey(mockDeal.id, "completed")

    // First call - creates transaction
    const result1 = await createTransactionFromDeal(mockDeal, idempotencyKey)
    expect(result1.isNew).toBe(true)

    // Second call with same idempotency key - returns existing
    const result2 = await createTransactionFromDeal(mockDeal, idempotencyKey)
    expect(result2.isNew).toBe(false)
    expect(result2.transaction.id).toBe(result1.transaction.id)
  })

  it("should handle concurrent requests with same idempotency key", async () => {
    const idempotencyKey = generateIdempotencyKey(mockDeal.id, "completed")

    // Simulate 10 concurrent requests
    const promises = Array.from({ length: 10 }, () => createTransactionFromDeal(mockDeal, idempotencyKey))

    const results = await Promise.all(promises)

    // Only one should be new, rest should return existing
    const newResults = results.filter((r) => r.isNew)
    expect(newResults.length).toBe(1)

    // All should have the same transaction ID
    const transactionIds = results.map((r) => r.transaction.id)
    const uniqueIds = [...new Set(transactionIds)]
    expect(uniqueIds.length).toBe(1)
  })

  it("should preserve historical rates in transaction", async () => {
    const result = await createTransactionFromDeal(mockDeal)

    expect(result.transaction.historicalRates).toBeDefined()
    expect(result.transaction.historicalRates.animator_rate).toBe(3000)
    expect(result.transaction.historicalRates.host_rate).toBe(5000)
    expect(result.transaction.historicalRates.dj_rate).toBe(4000)
    expect(result.transaction.historicalRates.animators_count).toBe(2)
  })

  it("should throw error for missing required fields", async () => {
    const incompleteDeal: any = {
      id: "deal-123",
      title: "Test",
      locationId: "loc-456",
      // Missing participants and checkPerPerson
    }

    await expect(createTransactionFromDeal(incompleteDeal)).rejects.toThrow("Missing required fields")
  })
})
