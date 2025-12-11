"use client"

import { useAuth } from "@/contexts/auth-context"
import { PersonnelSection } from "@/components/personnel-section"
import { PersonnelScheduleAdmin } from "@/components/personnel-schedule-admin"
import { PersonnelFranchisee } from "@/components/personnel-franchisee"

export default function PersonnelPage() {
  const { user } = useAuth()

  if (user.role === "admin") {
    return <PersonnelScheduleAdmin />
  }

  if (user.role === "franchisee" || user.role === "own_point") {
    return <PersonnelFranchisee />
  }

  return <PersonnelSection role={user.role} />
}
