"use client"

import { useAuth } from "@/contexts/auth-context"
import { DealsKanban } from "@/components/deals-kanban"
import { GamesCRMFranchisee } from "@/components/games-crm-franchisee"

export default function CRMPage() {
  const { user } = useAuth()

  if (user?.role === "franchisee" || user?.role === "admin" || user?.role === "own_point") {
    return <GamesCRMFranchisee />
  }

  return <DealsKanban role={user?.role || ""} />
}
