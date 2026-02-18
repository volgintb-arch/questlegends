"use client"

import { useAuth } from "@/contexts/auth-context"
import { DashboardUK } from "@/components/dashboard-uk"
import { DashboardFranchisee } from "@/components/dashboard-franchisee"
import { DashboardAdmin } from "@/components/dashboard-admin"
import { DashboardEmployee } from "@/components/dashboard-employee"

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  const isUKOwner = user.role === "uk" || user.role === "super_admin"
  const isPersonnel = ["employee", "animator", "host", "dj"].includes(user.role)

  if (isUKOwner || user.role === "uk_employee") return <DashboardUK />
  if (user.role === "franchisee" || user.role === "own_point") return <DashboardFranchisee />
  if (user.role === "admin") return <DashboardAdmin />
  if (isPersonnel) return <DashboardEmployee />

  return <DashboardUK />
}
