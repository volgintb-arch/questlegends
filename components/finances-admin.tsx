"use client"

import { useState, useEffect } from "react"
import type { Expense, PayrollEntry } from "@/types" // Assuming Expense and PayrollEntry are declared in "@/types"

export function FinancesAdmin() {
  const [activeTab, setActiveTab] = useState<"expenses" | "payroll">("expenses")
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showPayrollForm, setShowPayrollForm] = useState(false)

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/expenses")
      const data = await response.json()
      if (response.ok) {
        setExpenses(data.expenses || [])
      }
    } catch (error) {
      console.error("[v0] Error loading expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const totalPayroll = payrollEntries.reduce((sum, entry) => sum + entry.total, 0)
}
