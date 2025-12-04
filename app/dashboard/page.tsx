"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
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
  const { data: session, status } = useSession()
  const [view, setView] = useState<View>("dashboard")
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
    }
  }, [session, status, router])

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  const user = {
    id: session.user.id,
    name: session.user.name || "Пользователь",
    role: session.user.role || "uk",
    email: session.user.email || "",
  }

  const renderView = () => {
    switch (view) {
      case "dashboard":
        if (user.role === "uk" || user.role === "uk_employee") return <DashboardUK />
        if (user.role === "franchisee") return <DashboardFranchisee />
        if (user.role === "admin") return <DashboardAdmin />
        if (user.role === "employee") return <DashboardEmployee />
        return <DashboardUK />
      case "deals":
        return <DealsKanban role={user.role} />
      case "transactions":
        return <TransactionsERP role={user.role} />
      case "finances":
        if (user.role === "admin") return <FinancesAdmin />
        if (user.role === "franchisee") return <FinancesFranchisee />
        return <TransactionsERP role={user.role} />
      case "schedule":
        if (user.role === "admin") return <PersonnelScheduleAdmin />
        return <PersonnelSection role={user.role} />
      case "personnel":
        if (user.role === "admin") return <PersonnelScheduleAdmin />
        if (user.role === "franchisee") return <PersonnelFranchisee />
        return <PersonnelSection role={user.role} />
      case "knowledge":
        if (user.role === "employee") return <KnowledgeBaseSection role="employee" />
        return <KnowledgeBaseSection role={user.role} />
      case "notifications":
        return <NotificationsSection role={user.role} />
      case "access":
        if (user.role === "uk" || user.role === "uk_employee") return <AccessManagementUK />
        if (user.role === "franchisee") return <AccessManagementFranchisee />
        if (user.role === "admin") return <AccessManagementAdmin />
        return <DashboardUK />
      default:
        return user.role === "uk" ? (
          <DashboardUK />
        ) : user.role === "admin" ? (
          <DashboardAdmin />
        ) : (
          <DashboardFranchisee />
        )
    }
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
          role={
            user.role === "uk" || user.role === "uk_employee"
              ? "Управляющая Компания"
              : user.role === "admin"
                ? "Администратор"
                : user.role === "employee"
                  ? "Сотрудник"
                  : "Франчайзи"
          }
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
