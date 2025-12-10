"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Shield, Building2, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/contexts/auth-context"

interface Franchisee {
  id: string
  name: string
  city: string
}

interface UserPermissions {
  dashboard: boolean
  crm: boolean
  erp: boolean
  kpi: boolean
  messages: boolean
  knowledgeBase: boolean
  notifications: boolean
}

interface AccessUser {
  id: string
  name: string
  email: string
  phone: string
  role: string
  roleDisplay: string
  franchiseeId?: string
  franchiseeName?: string
  permissions: UserPermissions
  assignedFranchisees: string[]
  status: "active" | "inactive"
}

const permissionLabels: Record<keyof UserPermissions, string> = {
  dashboard: "Дашборд",
  crm: "CRM",
  erp: "ERP",
  kpi: "KPI",
  messages: "Сообщения",
  knowledgeBase: "База Знаний",
  notifications: "Уведомления",
}

export function AccessManagementUK() {
  const { getAuthHeaders, user: currentUser, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<AccessUser[]>([])
  const [franchisees, setFranchisees] = useState<Franchisee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!currentUser) {
      setError("Не авторизован")
      setLoading(false)
      return
    }

    fetchUsers()
    fetchFranchisees()
  }, [authLoading, currentUser])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const headers = getAuthHeaders()
      const response = await fetch("/api/permissions", { headers })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      const formattedUsers = (data.users || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.telegram || u.phone,
        phone: u.phone,
        role: u.role,
        roleDisplay: u.role === "uk" ? "Директор УК" : "Сотрудник УК",
        franchiseeId: u.franchiseeId,
        franchiseeName: u.franchiseeName,
        permissions: {
          dashboard: u.userPermissions?.canViewDashboard ?? true,
          crm: u.userPermissions?.canViewCrm ?? true,
          erp: u.userPermissions?.canViewErp ?? true,
          kpi: u.userPermissions?.canViewKpi ?? true,
          messages: u.userPermissions?.canViewMessages ?? true,
          knowledgeBase: u.userPermissions?.canViewKnowledgeBase ?? true,
          notifications: u.userPermissions?.canViewNotifications ?? true,
        },
        assignedFranchisees: u.assignedFranchisees || [],
        status: u.isActive ? "active" : "inactive",
      }))

      setUsers(formattedUsers)
    } catch (error) {
      console.error("[v0] AccessManagement: Error fetching users:", error)
      setError(error instanceof Error ? error.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }

  const fetchFranchisees = async () => {
    try {
      const response = await fetch("/api/franchisees", {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error("Failed to fetch franchisees")
      const data = await response.json()

      if (Array.isArray(data)) {
        setFranchisees(
          data.map((f: any) => ({
            id: f.id,
            name: f.name,
            city: f.city,
          })),
        )
      }
    } catch (error) {
      console.error("[v0] Error fetching franchisees:", error)
    }
  }

  const handleTogglePermission = async (userId: string, permission: keyof UserPermissions) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    const newPermissions = {
      ...user.permissions,
      [permission]: !user.permissions[permission],
    }

    try {
      const response = await fetch("/api/permissions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          userId,
          permissions: {
            canViewDashboard: newPermissions.dashboard,
            canViewCrm: newPermissions.crm,
            canViewErp: newPermissions.erp,
            canViewKpi: newPermissions.kpi,
            canViewMessages: newPermissions.messages,
            canViewKnowledgeBase: newPermissions.knowledgeBase,
            canViewUsers: false, // Always false for UK employees
            canViewAccess: false, // Always false for UK employees
            canViewNotifications: newPermissions.notifications,
          },
        }),
      })

      if (!response.ok) throw new Error("Failed to update permissions")

      setUsers(users.map((u) => (u.id === userId ? { ...u, permissions: newPermissions } : u)))
    } catch (error) {
      console.error("[v0] Error updating permissions:", error)
      alert("Ошибка при обновлении прав доступа")
    }
  }

  const handleToggleFranchisee = async (userId: string, franchiseeId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    const newAssignedFranchisees = user.assignedFranchisees.includes(franchiseeId)
      ? user.assignedFranchisees.filter((id) => id !== franchiseeId)
      : [...user.assignedFranchisees, franchiseeId]

    try {
      const response = await fetch("/api/permissions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          userId,
          assignedFranchisees: newAssignedFranchisees,
        }),
      })

      if (!response.ok) throw new Error("Failed to update franchisee assignment")

      setUsers(users.map((u) => (u.id === userId ? { ...u, assignedFranchisees: newAssignedFranchisees } : u)))
    } catch (error) {
      console.error("[v0] Error updating franchisee assignment:", error)
      alert("Ошибка при обновлении доступа к франшизам")
    }
  }

  const canEdit = currentUser?.role === "super_admin"

  if (authLoading || loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" size={20} />
        <span>Загрузка...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-4 text-center border-red-200 bg-red-50 dark:bg-red-900/20">
          <h3 className="text-sm font-semibold mb-1 text-red-600">Ошибка загрузки</h3>
          <p className="text-xs text-red-500">{error}</p>
          <button
            onClick={() => {
              setError(null)
              fetchUsers()
            }}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Попробовать снова
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Управление Доступом</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {canEdit
            ? "Управление правами доступа сотрудников УК"
            : "Просмотр прав доступа сотрудников УК (только супер-админ может изменять)"}
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Shield className="text-primary" size={16} />
          Сотрудники УК ({users.length})
        </h2>

        <div className="grid gap-3">
          {users.length === 0 ? (
            <Card className="p-4 text-center">
              <Shield size={32} className="mx-auto mb-2 text-muted-foreground" />
              <h3 className="text-sm font-semibold mb-1">Нет сотрудников УК</h3>
              <p className="text-xs text-muted-foreground">Создайте сотрудников УК во вкладке "Пользователи"</p>
            </Card>
          ) : (
            users.map((user) => (
              <Card key={user.id} className="p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="text-primary" size={14} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{user.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{user.roleDisplay}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-muted-foreground">Email:</span> {user.email}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Тел:</span> {user.phone}
                    </div>
                  </div>

                  <div className="space-y-1 mb-2">
                    <p className="text-xs font-medium">
                      Права доступа к модулям:
                      {!canEdit && <span className="text-muted-foreground ml-1">(только просмотр)</span>}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(permissionLabels) as Array<keyof UserPermissions>).map((key) => (
                        <div key={key} className="flex items-center gap-1">
                          <Checkbox
                            className="h-3 w-3"
                            checked={user.permissions[key]}
                            onCheckedChange={() => handleTogglePermission(user.id, key)}
                            disabled={!canEdit}
                          />
                          <Label className="text-[10px]">{permissionLabels[key]}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-border">
                    <div className="flex items-center gap-1">
                      <Building2 size={12} className="text-muted-foreground" />
                      <p className="text-xs font-medium">
                        Доступ к франшизам ({user.assignedFranchisees.length}/{franchisees.length}):
                      </p>
                    </div>
                    {franchisees.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">Нет франшиз в системе</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {franchisees.map((franchisee) => (
                          <div key={franchisee.id} className="flex items-center gap-1">
                            <Checkbox
                              className="h-3 w-3"
                              checked={user.assignedFranchisees.includes(franchisee.id)}
                              onCheckedChange={() => handleToggleFranchisee(user.id, franchisee.id)}
                              disabled={!canEdit}
                            />
                            <Label className="text-[10px] cursor-pointer">{franchisee.name}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Card className="p-3 bg-muted/30 border-dashed">
        <div className="flex items-start gap-2">
          <Shield size={16} className="text-primary mt-0.5" />
          <div>
            <h3 className="text-xs font-medium">Система прав доступа</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Сотрудники УК имеют полный доступ к CRM и другим модулям. Управление пользователями и доступом доступно
              только супер-админу.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
