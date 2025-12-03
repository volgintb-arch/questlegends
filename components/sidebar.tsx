"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutGrid,
  HandshakeIcon,
  TrendingUp,
  BookOpen,
  Bell,
  Users,
  Calendar,
  DollarSign,
  Shield,
  UserCog,
} from "lucide-react"

interface SidebarProps {
  role: "uk" | "franchisee" | "admin" | "animator" | "host" | "dj"
  currentPath: string
  isMobileOpen?: boolean
  onMobileToggle?: (open: boolean) => void
}

export function Sidebar({ role, currentPath, isMobileOpen = false, onMobileToggle }: SidebarProps) {
  const router = useRouter()

  const getMenuItems = () => {
    const commonItems = [{ id: "dashboard", label: "Дашборд", icon: LayoutGrid, path: "/" }]

    const ukItems = [
      ...commonItems,
      { id: "deals", label: "CRM", icon: HandshakeIcon, path: "/crm" },
      { id: "transactions", label: "ERP", icon: TrendingUp, path: "/erp" },
      { id: "knowledge", label: "База Знаний", icon: BookOpen, path: "/knowledge" },
      { id: "users", label: "Пользователи", icon: UserCog, path: "/users" },
      { id: "access", label: "Доступ", icon: Users, path: "/access" },
      { id: "notifications", label: "Уведомления", icon: Bell, path: "/notifications" },
    ]

    const franchiseeItems = [
      ...commonItems,
      { id: "deals", label: "CRM", icon: HandshakeIcon, path: "/crm" },
      { id: "transactions", label: "ERP", icon: TrendingUp, path: "/erp" },
      { id: "personnel", label: "График", icon: Calendar, path: "/personnel" },
      { id: "finances", label: "Расходы", icon: DollarSign, path: "/finances" },
      { id: "knowledge", label: "База Знаний", icon: BookOpen, path: "/knowledge" },
      { id: "users", label: "Пользователи", icon: UserCog, path: "/users" },
      { id: "access", label: "Доступ", icon: Shield, path: "/access" },
      { id: "notifications", label: "Уведомления", icon: Bell, path: "/notifications" },
    ]

    const adminItems = [
      ...commonItems,
      { id: "deals", label: "CRM", icon: HandshakeIcon, path: "/crm" },
      { id: "finances", label: "Расходы", icon: DollarSign, path: "/finances" },
      { id: "schedule", label: "График", icon: Calendar, path: "/personnel" },
      { id: "knowledge", label: "База Знаний", icon: BookOpen, path: "/knowledge" },
      { id: "users", label: "Пользователи", icon: UserCog, path: "/users" },
      { id: "access", label: "Доступ", icon: Shield, path: "/access" },
    ]

    const personnelItems = [
      { id: "schedule", label: "Мои Смены", icon: Calendar, path: "/shifts" },
      { id: "knowledge", label: "База Знаний", icon: BookOpen, path: "/knowledge" },
    ]

    if (role === "uk") return ukItems
    if (role === "franchisee") return franchiseeItems
    if (role === "admin") return adminItems
    if (role === "animator" || role === "host" || role === "dj") return personnelItems
    return commonItems
  }

  const menuItems = getMenuItems()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen && onMobileToggle) {
        onMobileToggle(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isMobileOpen, onMobileToggle])

  const handleNavigation = (path: string) => {
    router.push(path)
    onMobileToggle?.(false)
  }

  const getRoleLabel = () => {
    const roleLabels = {
      uk: "Управляющая Компания",
      franchisee: "Франчайзи",
      admin: "Администратор",
      animator: "Аниматор",
      host: "Ведущий",
      dj: "DJ",
    }
    return roleLabels[role] || role
  }

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => onMobileToggle?.(false)} />
      )}

      <aside
        className={`fixed md:static left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-transform duration-300 z-40 w-64 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col p-4 sm:p-6">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-sidebar-primary mb-1">QuestLegends</h1>
            <p className="text-xs text-sidebar-primary-foreground/60 uppercase tracking-wider">OS 2.0</p>
            <p className="text-xs text-sidebar-primary-foreground/50 mt-2">{getRoleLabel()}</p>
          </div>

          <nav className="flex-1 space-y-1 sm:space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPath === item.path

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-all text-left ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/30"
                  }`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="border-t border-sidebar-border pt-3 sm:pt-4 text-xs text-sidebar-primary-foreground/60">
            <p>QuestLegends OS 2.0</p>
            <p>Version 2.0.1</p>
          </div>
        </div>
      </aside>
    </>
  )
}
