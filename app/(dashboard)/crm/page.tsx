"use client"

import { useAuth } from "@/contexts/auth-context"
import { DealsKanban } from "@/components/deals-kanban"
import { GamesCRMFranchisee } from "@/components/games-crm-franchisee"

export default function CRMPage() {
  const { user } = useAuth()

  // Франчайзи, администратор и собственная точка видят CRM игр
  if (user?.role === "franchisee" || user?.role === "admin" || user?.role === "own_point") {
    return <GamesCRMFranchisee />
  }

  // UK (включая super_admin) и uk_employee видят B2B/B2C CRM (Kanban)
  return <DealsKanban role={user?.role || "uk"} />
}
