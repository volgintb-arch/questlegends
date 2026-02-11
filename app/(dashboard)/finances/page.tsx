"use client"

import { useAuth } from "@/contexts/auth-context"
import { FinancesAdmin } from "@/components/finances-admin"
import { FinancesFranchisee } from "@/components/finances-franchisee"
import { TransactionsERP } from "@/components/transactions-erp"

export default function FinancesPage() {
  const { user } = useAuth()

  // UK видит полный ERP с финансами
  if (user.role === "uk" || user.role === "super_admin") {
    return <TransactionsERP role="uk" />
  }

  if (user.role === "admin") {
    return <FinancesAdmin />
  }

  if (user.role === "franchisee" || user.role === "own_point") {
    return <FinancesFranchisee />
  }

  return <div className="p-6 text-muted-foreground">Доступ запрещен</div>
}
