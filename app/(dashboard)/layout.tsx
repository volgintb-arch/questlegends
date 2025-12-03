"use client"

import type React from "react"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/auth-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        role={user.role}
        currentPath={pathname}
        isMobileOpen={isMobileSidebarOpen}
        onMobileToggle={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          userName={user.name}
          role={
            user.role === "uk"
              ? "Управляющая Компания"
              : user.role === "admin"
                ? "Администратор"
                : user.role === "employee"
                  ? "Сотрудник"
                  : "Франчайзи"
          }
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 pb-20 md:pb-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
