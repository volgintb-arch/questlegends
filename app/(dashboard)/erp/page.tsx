"use client"

import { useAuth } from "@/contexts/auth-context"
import { TransactionsERP } from "@/components/transactions-erp"

export default function ERPPage() {
  const { user } = useAuth()

  const validRole = user.role as "uk" | "franchisee" | "own_point" | "admin" | "uk_employee" | "super_admin"

  return <TransactionsERP role={validRole} />
}
