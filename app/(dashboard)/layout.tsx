"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/auth-context"
import { ErrorBoundary } from "@/components/error-boundary"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [isLoading, user, router])

  // Check royalty payments on dashboard load (once per session)
  useEffect(() => {
    if (!user) return
    const key = `royalty-check-${new Date().toISOString().slice(0, 10)}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")

    const token = localStorage.getItem("token")
    if (!token) return
    fetch("/api/notifications/check-royalty", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }, [user])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-mesh">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-mesh">
        <div className="text-center">
          <p className="text-muted-foreground">Перенаправление на страницу входа...</p>
        </div>
      </div>
    )
  }

  const getRoleDisplayName = (role: string) => {
    const roleLabels: Record<string, string> = {
      super_admin: "Управляющая Компания",
      uk: "Управляющая Компания",
      uk_employee: "Сотрудник УК",
      franchisee: "Франчайзи",
      own_point: "Собственная Точка",
      admin: "Администратор",
      employee: "Сотрудник",
      animator: "Аниматор",
      host: "Ведущий",
      dj: "DJ",
    }
    return roleLabels[role] || role
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-mesh overflow-hidden">
        <Sidebar
          role={user.role}
          currentPath={pathname}
          isMobileOpen={isMobileSidebarOpen}
          onMobileToggle={setIsMobileSidebarOpen}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            userName={user.name}
            role={getRoleDisplayName(user.role)}
            onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 pb-20 md:pb-8">{children}</div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
