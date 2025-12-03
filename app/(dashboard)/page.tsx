"use client"

import { useAuth } from "@/contexts/auth-context"
import { DashboardUK } from "@/components/dashboard-uk"
import { DashboardFranchisee } from "@/components/dashboard-franchisee"
import { DashboardAdmin } from "@/components/dashboard-admin"
import { DashboardEmployee } from "@/components/dashboard-employee"

export default function DashboardPage() {
  const { user } = useAuth()

  const renderDashboard = () => {
    switch (user.role) {
      case "uk":
        return <DashboardUK />
      case "franchisee":
        return <DashboardFranchisee />
      case "admin":
        return <DashboardAdmin />
      case "employee":
        return <DashboardEmployee />
      default:
        return <DashboardUK />
    }
  }

  return <>{renderDashboard()}</>
}
