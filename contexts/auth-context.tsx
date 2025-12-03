"use client"

import { createContext, useContext, type ReactNode, useState } from "react"

export type UserRole = "uk" | "uk_employee" | "franchisee" | "admin" | "employee"

export const ROLE_PERMISSIONS = {
  uk: {
    dashboard: true,
    crm: true,
    b2bCrm: true,
    erp: true,
    finances: true,
    personnel: true,
    schedules: true,
    access: true,
    kb: true,
    analytics: true,
    createFranchisee: true,
    createUsers: ["franchisee", "uk_employee"],
    viewAllLocations: true,
    canManageKPI: true,
  },
  uk_employee: {
    dashboard: true,
    b2bCrm: true,
    kb: true,
    analytics: false,
    viewOwnTasks: true,
    cannotAccessB2C: true,
    cannotAccessLocations: true,
  },
  franchisee: {
    dashboard: true,
    crm: true,
    erp: true,
    finances: true,
    personnel: true,
    schedules: true,
    access: true,
    kb: true,
    analytics: true,
    createUsers: ["admin", "employee"],
    viewOwnLocations: true,
    addExpenses: true,
    manageAdminPermissions: true,
    editTelegramTemplates: true,
  },
  admin: {
    dashboard: true,
    crm: false,
    erp: false,
    finances: false,
    schedules: false,
    kb: true, // Always has KB access
    users: false,
    createUsers: ["employee"], // Can only create employee (animator/host/dj)
    viewOwnLocation: true,
    cannotManageAccess: true, // Cannot delegate or manage access
    cannotCreateCustomRoles: true,
  },
  employee: {
    schedules: true,
    kb: true,
    viewOwnSchedule: true,
    viewOwnTasks: true,
  },
} as const

export interface Franchisee {
  id: string
  name: string
  location: string
  address: string
  manager: string
}

export interface User {
  id: string
  name: string
  role: UserRole
  email: string
  phone?: string
  franchiseeIds?: string[]
  franchiseeName?: string
  description?: string
  telegram_id?: string
  whatsapp?: string
}

interface AuthContextType {
  user: User
  franchisees: Franchisee[]
  setUser: (user: User) => void
  canAccess: (requiredRole: UserRole[]) => boolean
  getAccessibleFranchisees: () => Franchisee[]
  hasPermission: (permission: string) => boolean
  canCreateRole: (role: UserRole) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>({
    id: "user-1",
    name: "Иван Петров",
    role: "uk",
    email: "ivan@questlegends.ru",
  })

  const franchisees: Franchisee[] = [
    {
      id: "f1",
      name: "QuestLegends Москва",
      location: "Москва",
      address: "ул. Тверская, 1",
      manager: "Алексей Сидоров",
    },
    {
      id: "f2",
      name: "QuestLegends СПБ",
      location: "Санкт-Петербург",
      address: "Невский пр., 100",
      manager: "Мария Иванова",
    },
    {
      id: "f3",
      name: "QuestLegends Казань",
      location: "Казань",
      address: "ул. Баумана, 50",
      manager: "Дмитрий Никитин",
    },
    {
      id: "f4",
      name: "QuestLegends Новосибирск",
      location: "Новосибирск",
      address: "ул. Красный пр., 75",
      manager: "Екатерина Волкова",
    },
  ]

  const canAccess = (requiredRoles: UserRole[]): boolean => {
    return requiredRoles.includes(user.role)
  }

  const getAccessibleFranchisees = (): Franchisee[] => {
    if (user.role === "uk") {
      return franchisees
    } else if (user.role === "franchisee" && user.franchiseeIds) {
      return franchisees.filter((f) => user.franchiseeIds?.includes(f.id))
    }
    return []
  }

  const hasPermission = (permission: string): boolean => {
    const permissions = ROLE_PERMISSIONS[user.role] as Record<string, any>
    return !!permissions[permission]
  }

  const canCreateRole = (role: UserRole): boolean => {
    const permissions = ROLE_PERMISSIONS[user.role] as any
    
    if (user.role === "admin" && (role === "admin" || role === "franchisee" || role === "uk" || role === "uk_employee")) {
      return false
    }
    
    const checkRole = ["animator", "host", "dj"].includes(role) ? "employee" : role
    
    return permissions.createUsers?.includes(checkRole) || false
  }

  const value: AuthContextType = {
    user,
    franchisees,
    setUser,
    canAccess,
    getAccessibleFranchisees,
    hasPermission,
    canCreateRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
