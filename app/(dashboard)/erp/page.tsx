"use client"

import { useAuth } from "@/contexts/auth-context"
import { TransactionsERP } from "@/components/transactions-erp"

export default function ERPPage() {
  const { user } = useAuth()

  return <TransactionsERP role={user.role} />
}
