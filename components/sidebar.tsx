"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutGrid,
  HandshakeIcon,
  TrendingUp,
  RussianRuble,
  BookOpen,
  Bell,
  Users,
  Calendar,
  Shield,
  UserCog,
  MessageSquare,
  Share2,
  Building2,
  ScrollText,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface SidebarProps {
  role: string
  currentPath: string
  isMobileOpen?: boolean
  onMobileToggle?: (open: boolean) => void
}

export function Sidebar({ role, currentPath, isMobileOpen = false, onMobileToggle }: SidebarProps) {
  const router = useRouter()
  const { canViewModule, user } = useAuth()

  const getMenuItems = () => {
    const commonItems = [
      { id: "dashboard", label: "Дашборд", icon: LayoutGrid, path: "/", module: "canViewDashboard" as const },
    ]

    const ukItems = [
      { id: "dashboard", label: "Дашборд", icon: LayoutGrid, path: "/", module: "canViewDashboard" as const },
      { id: "deals", label: "CRM", icon: HandshakeIcon, path: "/crm", module: "canViewCrm" as const },
      { id: "transactions", label: "ERP", icon: TrendingUp, path: "/erp", module: "canViewErp" as const },
      { id: "franchise-management", label: "Франчизи", icon: Building2, path: "/franchise-management", module: "canViewDashboard" as const },
      {
        id: "messages",
        label: "Чат",
        icon: MessageSquare,
        path: "/messages",
        module: "canViewMessages" as const,
      },
      {
        id: "social-integrations",
        label: "Интеграции",
        icon: Share2,
        path: "/social-integrations",
        module: "canViewDashboard" as const,
      },
      {
        id: "knowledge",
        label: "База Знаний",
        icon: BookOpen,
        path: "/knowledge",
        module: "canViewKnowledgeBase" as const,
      },
    { id: "users", label: "Пользователи", icon: UserCog, path: "/users", module: "canViewUsers" as const },
    { id: "access", label: "Доступ", icon: Users, path: "/access", module: "canViewAccess" as const },
    {
      id: "notifications",
      label: "Уведомления",
      icon: Bell,
      path: "/notifications",
      module: "canViewNotifications" as const,
    },
    {
      id: "logs",
      label: "Логи",
      icon: ScrollText,
      path: "/logs",
      module: "canViewDashboard" as const,
    },
  ]

  const ukEmployeeItems = [
      { id: "dashboard", label: "Дашборд", icon: LayoutGrid, path: "/", module: "canViewDashboard" as const },
      { id: "deals", label: "CRM", icon: HandshakeIcon, path: "/crm", module: "canViewCrm" as const },
      { id: "transactions", label: "ERP", icon: TrendingUp, path: "/erp", module: "canViewErp" as const },
      { id: "franchise-management", label: "Франчизи", icon: Building2, path: "/franchise-management", module: "canViewDashboard" as const },
      {
        id: "messages",
        label: "Чат",
        icon: MessageSquare,
        path: "/messages",
        module: "canViewMessages" as const,
      },
      {
        id: "social-integrations",
        label: "Интеграции",
        icon: Share2,
        path: "/social-integrations",
        module: "canViewDashboard" as const,
      },
      {
        id: "knowledge",
        label: "База Знаний",
        icon: BookOpen,
        path: "/knowledge",
    module: "canViewKnowledgeBase" as const,
    },
    { id: "users", label: "Пользователи", icon: UserCog, path: "/users", module: "canViewUsers" as const },
    { id: "access", label: "Доступ", icon: Users, path: "/access", module: "canViewAccess" as const },
    {
      id: "notifications",
      label: "Уведомления",
      icon: Bell,
      path: "/notifications",
      module: "canViewNotifications" as const,
    },
  ]

  const franchiseeItems = [
      { id: "dashboard", label: "Дашборд", icon: LayoutGrid, path: "/", module: "canViewDashboard" as const },
      { id: "deals", label: "CRM", icon: HandshakeIcon, path: "/crm", module: "canViewCrm" as const },
      { id: "finances", label: "Финансы", icon: RussianRuble, path: "/finances", module: "canViewErp" as const },
      {
        id: "messages",
        label: "Чат",
        icon: MessageSquare,
        path: "/messages",
        module: "canViewMessages" as const,
      },
      {
        id: "social-integrations",
        label: "Интеграции",
        icon: Share2,
        path: "/social-integrations",
        module: "canViewDashboard" as const,
      },
      { id: "personnel", label: "График", icon: Calendar, path: "/personnel", module: "canViewDashboard" as const },
      {
        id: "knowledge",
        label: "База Знаний",
        icon: BookOpen,
        path: "/knowledge",
        module: "canViewKnowledgeBase" as const,
      },
      { id: "users", label: "Пользователи", icon: UserCog, path: "/users", module: "canViewUsers" as const },
      { id: "access", label: "Доступ", icon: Shield, path: "/access", module: "canViewAccess" as const },
      {
        id: "notifications",
        label: "Уведомления",
        icon: Bell,
        path: "/notifications",
        module: "canViewNotifications" as const,
      },
    ]

    const ownPointItems = [
      { id: "dashboard", label: "Дашборд", icon: LayoutGrid, path: "/", module: "canViewDashboard" as const },
      { id: "deals", label: "CRM", icon: HandshakeIcon, path: "/crm", module: "canViewCrm" as const },
      { id: "finances", label: "Финансы", icon: RussianRuble, path: "/finances", module: "canViewErp" as const },
      {
        id: "messages",
        label: "Чат",
        icon: MessageSquare,
        path: "/messages",
        module: "canViewMessages" as const,
      },
      {
        id: "social-integrations",
        label: "Интеграции",
        icon: Share2,
        path: "/social-integrations",
        module: "canViewDashboard" as const,
      },
      { id: "personnel", label: "График", icon: Calendar, path: "/personnel", module: "canViewDashboard" as const },
      {
        id: "knowledge",
        label: "База Знаний",
        icon: BookOpen,
        path: "/knowledge",
        module: "canViewKnowledgeBase" as const,
      },
      { id: "users", label: "Пользователи", icon: UserCog, path: "/users", module: "canViewUsers" as const },
      { id: "access", label: "Доступ", icon: Shield, path: "/access", module: "canViewAccess" as const },
      {
        id: "notifications",
        label: "Уведомления",
        icon: Bell,
        path: "/notifications",
        module: "canViewNotifications" as const,
      },
    ]

    const adminItems = [
      { id: "dashboard", label: "Дашборд", icon: LayoutGrid, path: "/", module: "canViewDashboard" as const },
      { id: "deals", label: "CRM", icon: HandshakeIcon, path: "/crm", module: "canViewCrm" as const },
      { id: "schedule", label: "График", icon: Calendar, path: "/personnel", module: "canViewKpi" as const },
      { id: "messages", label: "Чат", icon: MessageSquare, path: "/messages", module: "canViewMessages" as const },
      {
        id: "knowledge",
        label: "База Знаний",
        icon: BookOpen,
        path: "/knowledge",
        module: "canViewKnowledgeBase" as const,
      },
      { id: "users", label: "Пользователи", icon: UserCog, path: "/users", module: "canViewUsers" as const },
    ]

    const personnelItems = [
      { id: "dashboard", label: "Дашборд", icon: LayoutGrid, path: "/", module: "canViewDashboard" as const },
      { id: "schedule", label: "Мои Смены", icon: Calendar, path: "/personnel", module: "canViewDashboard" as const },
      {
        id: "knowledge",
        label: "База Знаний",
        icon: BookOpen,
        path: "/knowledge",
        module: "canViewKnowledgeBase" as const,
      },
    ]

    if (role === "super_admin" || role === "uk") return ukItems
    if (role === "uk_employee") {
      return ukEmployeeItems.filter((item) => canViewModule(item.module))
    }
    if (role === "own_point") return ownPointItems
    if (role === "franchisee") return franchiseeItems
    if (role === "admin") return adminItems.filter((item) => canViewModule(item.module))
    if (role === "employee" || role === "animator" || role === "host" || role === "dj") return personnelItems
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
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => onMobileToggle?.(false)} />
      )}

      <aside
        className={`fixed md:static left-0 top-0 h-screen glass-sidebar transition-transform duration-300 z-40 w-52 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col p-3 sm:p-4">
          <div className="mb-4 sm:mb-6">
            <img src="/logo.png" alt="Легенда об Искателях" className="w-12 h-12 sm:w-14 sm:h-14 object-contain mb-1" />
            <p className="text-[10px] text-muted-foreground mt-1">{getRoleLabel()}</p>
          </div>

          <nav className="flex-1 space-y-0.5 sm:space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPath === item.path

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg transition-all text-left ${
                    isActive
                      ? "gradient-primary text-white glow-purple-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon size={14} className="flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="border-t border-sidebar-border pt-2 sm:pt-3">
            <img src="/logo.png" alt="" className="w-6 h-6 object-contain opacity-40" />
          </div>
        </div>
      </aside>
    </>
  )
}
