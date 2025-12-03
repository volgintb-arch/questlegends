/**
 * Unit tests for calculation helpers
 * Run with: npm test calculations.test.ts
 */

import { describe, it, expect } from "@jest/globals"
import {
  calcTotalRevenue,
  calcFOT,
  calcRoyalty,
  calcNetProfit,
  calculateAll,
  calcAverageCheck,
  calcProfitMargin,
  createHistoricalRates,
} from "./calculations"

describe("Calculation Helpers", () => {
  describe("calcTotalRevenue", () => {
    it("should calculate total revenue correctly", () => {
      expect(calcTotalRevenue(10, 5000)).toBe(50000)
      expect(calcTotalRevenue(5, 3000)).toBe(15000)
      expect(calcTotalRevenue(0, 5000)).toBe(0)
    })

    it("should throw error for negative inputs", () => {
      expect(() => calcTotalRevenue(-1, 5000)).toThrow()
      expect(() => calcTotalRevenue(10, -5000)).toThrow()
    })

    it("should handle decimal participants (rounds)", () => {
      expect(calcTotalRevenue(10.5, 5000)).toBe(52500)
    })
  })

  describe("calcFOT", () => {
    it("should calculate FOT correctly", () => {
      // animators=2, rate=3000, host=5000, dj=4000
      expect(calcFOT(2, 3000, 5000, 4000)).toBe(15000)
      expect(calcFOT(0, 3000, 5000, 4000)).toBe(9000)
      expect(calcFOT(3, 2000, 3000, 2000)).toBe(11000)
    })

    it("should throw error for negative rates", () => {
      expect(() => calcFOT(-1, 3000, 5000, 4000)).toThrow()
      expect(() => calcFOT(2, -3000, 5000, 4000)).toThrow()
    })

    it("should handle zero animators", () => {
      expect(calcFOT(0, 3000, 5000, 4000)).toBe(9000)
    })
  })

  describe("calcRoyalty", () => {
    it("should calculate 7% royalty by default", () => {
      expect(calcRoyalty(50000)).toBe(3500)
      expect(calcRoyalty(100000)).toBe(7000)
    })

    it("should support custom royalty percent", () => {
      expect(calcRoyalty(50000, 0.1)).toBe(5000)
      expect(calcRoyalty(50000, 0.05)).toBe(2500)
    })

    it("should throw error for invalid royalty percent", () => {
      expect(() => calcRoyalty(50000, -0.1)).toThrow()
      expect(() => calcRoyalty(50000, 1.5)).toThrow()
    })

    it("should handle zero revenue", () => {
      expect(calcRoyalty(0)).toBe(0)
    })
  })

  describe("calcNetProfit", () => {
    it("should calculate net profit correctly", () => {
      // revenue=50000, royalty=3500, fot=15000, expenses=0
      expect(calcNetProfit(50000, 3500, 15000, 0)).toBe(31500)
    })

    it("should include expenses in calculation", () => {
      // revenue=50000, royalty=3500, fot=15000, expenses=5000
      expect(calcNetProfit(50000, 3500, 15000, 5000)).toBe(26500)
    })

    it("should handle zero expenses (default)", () => {
      expect(calcNetProfit(50000, 3500, 15000)).toBe(31500)
    })

    it("should handle negative profit", () => {
      expect(calcNetProfit(10000, 3500, 15000, 5000)).toBe(-13500)
    })
  })

  describe("calculateAll", () => {
    it("should calculate all metrics for standard scenario", () => {
      const inputs = {
        participants: 10,
        checkPerPerson: 5000,
        animatorsCount: 2,
        animatorRate: 3000,
        hostRate: 5000,
        djRate: 4000,
      }

      const result = calculateAll(inputs)

      expect(result.totalRevenue).toBe(50000)
      expect(result.fot).toBe(15000)
      expect(result.royalty).toBe(3500)
      expect(result.netProfit).toBe(31500)
    })

    it("should include expenses in net profit", () => {
      const inputs = {
        participants: 10,
        checkPerPerson: 5000,
        animatorsCount: 2,
        animatorRate: 3000,
        hostRate: 5000,
        djRate: 4000,
      }

      const result = calculateAll(inputs, 5000)

      expect(result.netProfit).toBe(26500)
      expect(result.expenses).toBe(5000)
    })

    it("should handle small game scenario", () => {
      const inputs = {
        participants: 5,
        checkPerPerson: 3000,
        animatorsCount: 1,
        animatorRate: 2000,
        hostRate: 3000,
        djRate: 0,
      }

      const result = calculateAll(inputs)

      expect(result.totalRevenue).toBe(15000)
      expect(result.fot).toBe(5000)
      expect(result.royalty).toBe(1050)
      expect(result.netProfit).toBe(8950)
    })
  })

  describe("calcAverageCheck", () => {
    it("should calculate average check correctly", () => {
      expect(calcAverageCheck(100000, 20)).toBe(5000)
      expect(calcAverageCheck(50000, 10)).toBe(5000)
    })

    it("should handle zero games", () => {
      expect(calcAverageCheck(100000, 0)).toBe(0)
    })

    it("should round to nearest integer", () => {
      expect(calcAverageCheck(100000, 3)).toBe(33333)
    })
  })

  describe("calcProfitMargin", () => {
    it("should calculate profit margin percentage", () => {
      expect(calcProfitMargin(31500, 50000)).toBe(63)
      expect(calcProfitMargin(25000, 100000)).toBe(25)
    })

    it("should handle zero revenue", () => {
      expect(calcProfitMargin(10000, 0)).toBe(0)
    })

    it("should handle negative profit", () => {
      expect(calcProfitMargin(-10000, 50000)).toBe(-20)
    })

    it("should return percentage with 2 decimal places", () => {
      expect(calcProfitMargin(33333, 100000)).toBe(33.33)
    })
  })

  describe("createHistoricalRates", () => {
    it("should create snapshot of rates", () => {
      const inputs = {
        participants: 10,
        checkPerPerson: 5000,
        animatorsCount: 2,
        animatorRate: 3000,
        hostRate: 5000,
        djRate: 4000,
      }

      const snapshot = createHistoricalRates(inputs)

      expect(snapshot.animator_rate).toBe(3000)
      expect(snapshot.host_rate).toBe(5000)
      expect(snapshot.dj_rate).toBe(4000)
      expect(snapshot.animators_count).toBe(2)
      expect(snapshot.snapshot_date).toBeDefined()
    })
  })

  // Integration test: Full game scenario
  describe("Integration: Complete Game Flow", () => {
    it("should calculate correct metrics for realistic game", () => {
      const gameInputs = {
        participants: 15,
        checkPerPerson: 4500,
        animatorsCount: 3,
        animatorRate: 2500,
        hostRate: 4000,
        djRate: 3500,
      }

      const expenses = 8000

      const results = calculateAll(gameInputs, expenses)

      // Expected calculations:
      // totalRevenue = 15 * 4500 = 67,500
      // fot = (3 * 2500) + 4000 + 3500 = 15,000
      // royalty = 67,500 * 0.07 = 4,725
      // netProfit = 67,500 - 4,725 - 15,000 - 8,000 = 39,775

      expect(results.totalRevenue).toBe(67500)
      expect(results.fot).toBe(15000)
      expect(results.royalty).toBe(4725)
      expect(results.netProfit).toBe(39775)

      const margin = calcProfitMargin(results.netProfit, results.totalRevenue)
      expect(margin).toBe(58.93)

      const historicalRates = createHistoricalRates(gameInputs)
      expect(historicalRates.animator_rate).toBe(2500)
    })
  })
})
