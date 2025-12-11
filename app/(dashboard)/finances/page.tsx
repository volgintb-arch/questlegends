"use client"

import { useAuth } from "@/contexts/auth-context"
import { FinancesAdmin } from "@/components/finances-admin"
import { FinancesFranchisee } from "@/components/finances-franchisee"

export default function FinancesPage() {
  const { user } = useAuth()

  if (user.role === "admin") {
    return <FinancesAdmin />
  }

  if (user.role === "franchisee" || user.role === "own_point") {
    return <FinancesFranchisee />
  }

  return <div>Access denied</div>
}
