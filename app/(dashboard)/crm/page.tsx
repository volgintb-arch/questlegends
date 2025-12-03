"use client"

import { useAuth } from "@/contexts/auth-context"
import { DealsKanban } from "@/components/deals-kanban"

export default function CRMPage() {
  const { user } = useAuth()

  return <DealsKanban role={user.role} />
}
