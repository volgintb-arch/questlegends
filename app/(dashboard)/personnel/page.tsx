"use client"

import { useAuth } from "@/contexts/auth-context"
import { PersonnelSection } from "@/components/personnel-section"
import { PersonnelScheduleAdmin } from "@/components/personnel-schedule-admin"
import { PersonnelFranchisee } from "@/components/personnel-franchisee"
import { DashboardEmployee } from "@/components/dashboard-employee"

export default function PersonnelPage() {
  const { user } = useAuth()

  // Сотрудники видят свои смены
  if (["employee", "animator", "host", "dj"].includes(user.role)) {
    return <DashboardEmployee />
  }

  if (user.role === "admin") {
    return <PersonnelScheduleAdmin />
  }

  if (user.role === "franchisee" || user.role === "own_point") {
    return <PersonnelFranchisee />
  }

  // UK и super_admin видят общий обзор персонала
  return <PersonnelSection role={user.role} />
}
