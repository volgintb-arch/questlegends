"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { DashboardUK } from "@/components/dashboard-uk"
import { DashboardFranchisee } from "@/components/dashboard-franchisee"
import { DashboardAdmin } from "@/components/dashboard-admin"
import { DealsKanban } from "@/components/deals-kanban"
import { TransactionsERP } from "@/components/transactions-erp"
import { PersonnelSection } from "@/components/personnel-section"
import { KnowledgeBaseSection } from "@/components/knowledge-base-section"
import { NotificationsSection } from "@/components/notifications-section"
import { useAuth } from "@/contexts/auth-context"
import { FinancesAdmin } from "@/components/finances-admin"
import { PersonnelScheduleAdmin } from "@/components/personnel-schedule-admin"
import { FinancesFranchisee } from "@/components/finances-franchisee"
import { PersonnelFranchisee } from "@/components/personnel-franchisee"
import { DashboardEmployee } from "@/components/dashboard-employee"
import { AccessManagementUK } from "@/components/access-management-uk"
import { AccessManagementFranchisee } from "@/components/access-management-franchisee"
import { AccessManagementAdmin } from "@/components/access-management-admin"

type View =
  | "dashboard"
  | "deals"
  | "transactions"
  | "personnel"
  | "knowledge"
  | "notifications"
  | "finances"
  | "access"
  | "schedule"

export default function Dashboard() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [view, setView] = useState<View>("dashboard")
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  const renderView = () => {
    const isUKOwner = user.role === "uk" || user.role === "super_admin"
    const isPersonnel = ["employee", "animator", "host", "dj"].includes(user.role)

    switch (view) {
      case "dashboard":
        if (isUKOwner || user.role === "uk_employee") return <DashboardUK />
        if (user.role === "franchisee" || user.role === "own_point") return <DashboardFranchisee />
        if (user.role === "admin") return <DashboardAdmin />
        if (isPersonnel) return <DashboardEmployee />
        return <DashboardUK />
      case "deals":
        return <DealsKanban role={isUKOwner ? "uk" : user.role as any} />
      case "transactions":
        return <TransactionsERP role={isUKOwner ? "uk" : user.role} />
      case "finances":
        if (isUKOwner) return <TransactionsERP role="uk" />
        if (user.role === "admin") return <FinancesAdmin />
        if (user.role === "franchisee" || user.role === "own_point") return <FinancesFranchisee />
        return <TransactionsERP role={user.role} />
      case "schedule":
        if (isPersonnel) return <DashboardEmployee />
        if (user.role === "admin") return <PersonnelScheduleAdmin />
        return <PersonnelSection role={isUKOwner ? "uk" : user.role} />
      case "personnel":
        if (isPersonnel) return <DashboardEmployee />
        if (user.role === "admin") return <PersonnelScheduleAdmin />
        if (user.role === "franchisee" || user.role === "own_point") return <PersonnelFranchisee />
        return <PersonnelSection role={isUKOwner ? "uk" : user.role} />
      case "knowledge":
        return <KnowledgeBaseSection role={user.role} />
      case "notifications":
        return <NotificationsSection role={user.role} />
      case "access":
        if (isUKOwner || user.role === "uk_employee") return <AccessManagementUK />
        if (user.role === "franchisee" || user.role === "own_point") return <AccessManagementFranchisee />
        if (user.role === "admin") return <AccessManagementAdmin />
        return <DashboardUK />
      default:
        if (isUKOwner || user.role === "uk_employee") return <DashboardUK />
        if (user.role === "admin") return <DashboardAdmin />
        if (isPersonnel) return <DashboardEmployee />
        return <DashboardFranchisee />
    }
  }

  const getRoleLabel = () => {
    const labels: Record<string, string> = {
      uk: "Управляющая Компания",
      super_admin: "Управляющая Компания",
      uk_employee: "Сотрудник УК",
      admin: "Администратор",
      employee: "Сотрудник",
      animator: "Аниматор",
      host: "Ведущий",
      dj: "DJ",
      franchisee: "Франчайзи",
      own_point: "Собственная Точка",
    }
    return labels[user.role] || "Сотрудник"
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        role={user.role}
        currentView={view}
        onViewChange={(newView) => {
          setView(newView)
          setIsMobileSidebarOpen(false)
        }}
        isMobileOpen={isMobileSidebarOpen}
        onMobileToggle={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          userName={user.name}
          role={getRoleLabel()}
          onViewChange={setView}
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 pb-20 md:pb-8">{renderView()}</div>
        </main>
      </div>
    </div>
  )
}
