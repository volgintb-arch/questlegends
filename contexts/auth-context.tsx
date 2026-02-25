"use client"

import { createContext, useContext, type ReactNode, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export type UserRole = "super_admin" | "uk" | "uk_employee" | "franchisee" | "own_point" | "admin" | "employee" | "animator" | "host" | "dj"

export const ROLE_PERMISSIONS = {
  // super_admin и uk объединены - одинаковый полный доступ
  super_admin: {
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
    createUsers: ["franchisee", "own_point", "uk_employee", "admin", "employee", "animator", "host", "dj"],
    viewAllLocations: true,
    canManageKPI: true,
    canManageAll: true,
    canManageSettings: true,
    auditLog: true,
  },
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
    createUsers: ["franchisee", "own_point", "uk_employee", "admin", "employee", "animator", "host", "dj"],
    viewAllLocations: true,
    canManageKPI: true,
    canManageAll: true,
    canManageSettings: true,
    auditLog: true,
  },
  uk_employee: {
    dashboard: true,
    b2bCrm: true,
    crm: true,
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
    createUsers: ["admin", "employee", "animator", "host", "dj"],
    viewOwnLocations: true,
    addExpenses: true,
    manageAdminPermissions: true,
    editTelegramTemplates: true,
  },
  own_point: {
    dashboard: true,
    crm: true,
    erp: true,
    finances: true,
    personnel: true,
    schedules: true,
    access: true,
    kb: true,
    analytics: true,
    createUsers: ["admin", "employee", "animator", "host", "dj"],
    viewOwnLocations: true,
    addExpenses: true,
    manageAdminPermissions: true,
    editTelegramTemplates: true,
    noRoyalty: true,
  },
  admin: {
    dashboard: true,
    crm: true,
    erp: false,
    finances: true,
    schedules: true,
    kb: true,
    users: true,
    createUsers: ["employee", "animator", "host", "dj"],
    viewOwnLocation: true,
    cannotManageAccess: true,
    cannotCreateCustomRoles: true,
  },
  employee: {
    dashboard: true,
    schedules: true,
    kb: true,
    viewOwnSchedule: true,
    viewOwnTasks: true,
  },
  animator: {
    dashboard: true,
    schedules: true,
    kb: true,
    viewOwnSchedule: true,
    viewOwnTasks: true,
  },
  host: {
    dashboard: true,
    schedules: true,
    kb: true,
    viewOwnSchedule: true,
    viewOwnTasks: true,
  },
  dj: {
    dashboard: true,
    schedules: true,
    kb: true,
    viewOwnSchedule: true,
    viewOwnTasks: true,
  },
} as const

export interface Franchisee {
  id: string
  name: string
  city: string
  location?: string
  address?: string
  manager?: string
}

export interface UserPermissions {
  canViewDashboard: boolean
  canViewCrm: boolean
  canViewErp: boolean
  canViewKpi: boolean
  canViewMessages: boolean
  canViewKnowledgeBase: boolean
  canViewUsers: boolean
  canViewAccess: boolean
  canViewNotifications: boolean
}

export interface User {
  id: string
  name: string
  role: UserRole
  email?: string
  phone?: string
  franchiseeId?: string
  franchiseeName?: string
  franchiseeCity?: string
  description?: string
  telegram_id?: string
  whatsapp?: string
  permissions?: UserPermissions
}

interface AuthContextType {
  user: User | null
  token: string | null
  franchisees: Franchisee[]
  loading: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  login: (phone: string, password: string) => Promise<void>
  logout: () => Promise<void>
  canAccess: (requiredRole: UserRole[]) => boolean
  getAccessibleFranchisees: () => Franchisee[]
  hasPermission: (permission: string) => boolean
  canCreateRole: (role: UserRole) => boolean
  getAuthHeaders: () => HeadersInit
  canViewModule: (module: keyof UserPermissions) => boolean
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const getStoredToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("auth-token")
}

const setStoredToken = (token: string | null) => {
  if (typeof window === "undefined") return
  if (token) {
    localStorage.setItem("auth-token", token)
  } else {
    localStorage.removeItem("auth-token")
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [franchisees, setFranchisees] = useState<Franchisee[]>([])
  const router = useRouter()

  const getAuthHeaders = (): HeadersInit => {
    const currentToken = token || getStoredToken()
    if (currentToken) {
      return { Authorization: `Bearer ${currentToken}` }
    }
    return {}
  }

  const loadUserPermissions = async (userId: string, authToken: string): Promise<UserPermissions | undefined> => {
    try {
      const response = await fetch(`/api/auth/permissions?userId=${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (response.ok) {
        const data = await response.json()
        return data.permissions
      }
    } catch (error) {
      console.error("[v0] Failed to load user permissions:", error)
    }
    return undefined
  }

  const refreshPermissions = async () => {
    if (!user || !token) return
    const permissions = await loadUserPermissions(user.id, token)
    if (permissions) {
      setUser({ ...user, permissions })
    }
  }

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedToken = getStoredToken()
        if (!storedToken) {
          setLoading(false)
          return
        }

        setToken(storedToken)

        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })

        if (response.ok) {
          const data = await response.json()

          let permissions: UserPermissions | undefined
          if (data.user.role === "uk" || data.user.role === "uk_employee" || data.user.role === "super_admin") {
            permissions = await loadUserPermissions(data.user.id, storedToken)
          }

          setUser({ ...data.user, permissions })

          if (data.user.role === "uk" || data.user.role === "super_admin") {
            const franchiseesRes = await fetch("/api/franchisees", {
              headers: { Authorization: `Bearer ${storedToken}` },
            })
            if (franchiseesRes.ok) {
              const franchiseesData = await franchiseesRes.json()
              setFranchisees(Array.isArray(franchiseesData) ? franchiseesData : franchiseesData.data || [])
            }
          }
        } else {
          setStoredToken(null)
          setToken(null)
        }
      } catch (error) {
        console.error("[v0] Failed to load user:", error)
        setStoredToken(null)
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (phone: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      })

      if (!response.ok) {
        let errorMessage = "Login failed"
        try {
          const contentType = response.headers.get("content-type") || ""
          if (contentType.includes("application/json")) {
            const data = await response.json()
            errorMessage = data.error || errorMessage
          } else {
            errorMessage = await response.text() || errorMessage
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      setStoredToken(data.token)
      setToken(data.token)

      let permissions: UserPermissions | undefined
      if (data.user.role === "uk" || data.user.role === "uk_employee" || data.user.role === "super_admin") {
        permissions = await loadUserPermissions(data.user.id, data.token)
      }

      setUser({ ...data.user, permissions })

      if (data.user.role === "uk" || data.user.role === "super_admin") {
        const franchiseesRes = await fetch("/api/franchisees", {
          headers: { Authorization: `Bearer ${data.token}` },
        })
        if (franchiseesRes.ok) {
          const franchiseesData = await franchiseesRes.json()
          setFranchisees(Array.isArray(franchiseesData) ? franchiseesData : franchiseesData.data || [])
        }
      }

      router.push("/")
    } catch (error) {
      console.error("[v0] Login failed:", error)
      throw error
    }
  }

  const logout = async () => {
    setStoredToken(null)
    setToken(null)
    setUser(null)
    setFranchisees([])
    router.push("/login")
  }

  const canAccess = (requiredRoles: UserRole[]): boolean => {
    if (!user) return false
    // uk и super_admin имеют одинаковый полный доступ
    if (user.role === "super_admin" || user.role === "uk") return true
    return requiredRoles.includes(user.role)
  }

  const getAccessibleFranchisees = (): Franchisee[] => {
    if (!user) return []

    if (user.role === "uk" || user.role === "super_admin") {
      return franchisees
    } else if (
      (user.role === "franchisee" || user.role === "own_point" || user.role === "admin") &&
      user.franchiseeId
    ) {
      return franchisees.filter((f) => f.id === user.franchiseeId)
    }
    return []
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (user.role === "super_admin") return true
    const permissions = ROLE_PERMISSIONS[user.role] as Record<string, any>
    return !!permissions[permission]
  }

  const canCreateRole = (role: UserRole): boolean => {
    if (!user) return false
    if (user.role === "super_admin") return true

    const permissions = ROLE_PERMISSIONS[user.role] as any

    if (
      user.role === "admin" &&
      (role === "admin" || role === "franchisee" || role === "uk" || role === "uk_employee" || role === "super_admin")
    ) {
      return false
    }

    const checkRole = ["animator", "host", "dj"].includes(role) ? "employee" : role

    return permissions.createUsers?.includes(checkRole) || false
  }

  const canViewModule = (module: keyof UserPermissions): boolean => {
    if (!user) return false

    // uk и super_admin - полный доступ ко всему
    if (user.role === "super_admin" || user.role === "uk") return true

    // uk_employee - доступ через персональные permissions
    if (user.role === "uk_employee") {
      if (!user.permissions) {
        const ukEmployeeDefaults: Record<keyof UserPermissions, boolean> = {
          canViewDashboard: true,
          canViewCrm: true,
          canViewErp: false,
          canViewKpi: false,
          canViewMessages: true,
          canViewKnowledgeBase: true,
          canViewUsers: false,
          canViewAccess: false,
          canViewNotifications: true,
        }
        return ukEmployeeDefaults[module]
      }
      return user.permissions[module]
    }

    return true
  }

  const value: AuthContextType = {
    user,
    token,
    franchisees,
    loading,
    isLoading: loading,
    setUser,
    login,
    logout,
    canAccess,
    getAccessibleFranchisees,
    hasPermission,
    canCreateRole,
    getAuthHeaders,
    canViewModule,
    refreshPermissions,
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
