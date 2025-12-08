"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Shield, Building2, User } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/contexts/auth-context"

interface Franchisee {
  id: string
  name: string
  city: string
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
  permissions: {
    dashboard: boolean
    deals: boolean
    finances: boolean
    constants: boolean
    notifications: boolean
  }
  assignedFranchisees: string[]
  status: "active" | "inactive"
}

export function AccessManagementUK() {
  const { getAuthHeaders, user: currentUser } = useAuth()
  const [users, setUsers] = useState<AccessUser[]>([])
  const [franchisees, setFranchisees] = useState<Franchisee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
    fetchFranchisees()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/permissions", {
        headers: {
          ...getAuthHeaders(),
        },
      })
      if (!response.ok) throw new Error("Failed to fetch users")
      const data = await response.json()

      const formattedUsers = data.users
        .filter((u: any) => u.role === "uk_employee" || u.role === "uk" || u.role === "franchisee")
        .map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.telegram || u.phone,
          phone: u.phone,
          role: u.role,
          roleDisplay: u.role === "uk" ? "Директор УК" : u.role === "uk_employee" ? "Сотрудник УК" : "Франчайзи",
          franchiseeId: u.franchiseeId,
          franchiseeName: u.franchiseeName,
          permissions: {
            dashboard: u.userPermissions?.canViewDashboard ?? true,
            deals: u.userPermissions?.canViewDeals ?? false,
            finances: u.userPermissions?.canViewFinances ?? false,
            constants: u.userPermissions?.canManageConstants ?? false,
            notifications: u.userPermissions?.canViewNotifications ?? true,
          },
          assignedFranchisees: u.assignedFranchisees || [],
          status: u.isActive ? "active" : "inactive",
        }))

      console.log("[v0] Fetched UK users and franchisees:", formattedUsers.length)
      setUsers(formattedUsers)
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFranchisees = async () => {
    try {
      const response = await fetch("/api/franchisees", {
        headers: {
          ...getAuthHeaders(),
        },
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

  const handleTogglePermission = async (userId: string, permission: keyof AccessUser["permissions"]) => {
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
            canViewDeals: newPermissions.deals,
            canViewFinances: newPermissions.finances,
            canManageConstants: newPermissions.constants,
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

  const canEdit = currentUser?.role === "super_admin" || currentUser?.role === "uk"

  const ukUsers = users.filter((u) => u.role === "uk" || u.role === "uk_employee")
  const franchiseeUsers = users.filter((u) => u.role === "franchisee")

  if (loading) {
    return <div className="p-6 text-center">Загрузка...</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Управление Доступом</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Управление правами доступа сотрудников УК и франчайзи
          {!canEdit && " (только просмотр)"}
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Shield className="text-primary" size={16} />
          Сотрудники УК ({ukUsers.length})
        </h2>

        <div className="grid gap-3">
          {ukUsers.length === 0 ? (
            <Card className="p-4 text-center">
              <Shield size={32} className="mx-auto mb-2 text-muted-foreground" />
              <h3 className="text-sm font-semibold mb-1">Нет сотрудников УК</h3>
              <p className="text-xs text-muted-foreground">В системе пока нет зарегистрированных сотрудников УК</p>
            </Card>
          ) : (
            ukUsers.map((user) => (
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
                    <p className="text-xs font-medium">Права доступа:</p>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1">
                        <Checkbox
                          className="h-3 w-3"
                          checked={user.permissions.dashboard}
                          onCheckedChange={() => handleTogglePermission(user.id, "dashboard")}
                          disabled={!canEdit}
                        />
                        <Label className="text-[10px]">Дашборд</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          className="h-3 w-3"
                          checked={user.permissions.deals}
                          onCheckedChange={() => handleTogglePermission(user.id, "deals")}
                          disabled={!canEdit}
                        />
                        <Label className="text-[10px]">CRM</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          className="h-3 w-3"
                          checked={user.permissions.finances}
                          onCheckedChange={() => handleTogglePermission(user.id, "finances")}
                          disabled={!canEdit}
                        />
                        <Label className="text-[10px]">Финансы</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          className="h-3 w-3"
                          checked={user.permissions.constants}
                          onCheckedChange={() => handleTogglePermission(user.id, "constants")}
                          disabled={!canEdit}
                        />
                        <Label className="text-[10px]">Константы</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          className="h-3 w-3"
                          checked={user.permissions.notifications}
                          onCheckedChange={() => handleTogglePermission(user.id, "notifications")}
                          disabled={!canEdit}
                        />
                        <Label className="text-[10px]">Уведомления</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-border">
                    <div className="flex items-center gap-1">
                      <Building2 size={12} className="text-muted-foreground" />
                      <p className="text-xs font-medium">
                        Франшизы ({user.assignedFranchisees.length}/{franchisees.length}):
                      </p>
                    </div>
                    {franchisees.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">Нет франшиз</p>
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

      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Building2 className="text-orange-500" size={16} />
          Франчайзи ({franchiseeUsers.length})
        </h2>

        <div className="grid gap-3">
          {franchiseeUsers.length === 0 ? (
            <Card className="p-4 text-center">
              <Building2 size={32} className="mx-auto mb-2 text-muted-foreground" />
              <h3 className="text-sm font-semibold mb-1">Нет франчайзи</h3>
              <p className="text-xs text-muted-foreground">В системе пока нет зарегистрированных франчайзи</p>
            </Card>
          ) : (
            franchiseeUsers.map((user) => (
              <Card key={user.id} className="p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <User className="text-orange-500" size={14} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{user.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] text-muted-foreground">{user.roleDisplay}</p>
                        {user.franchiseeName && (
                          <span className="text-[9px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded">
                            {user.franchiseeName}
                          </span>
                        )}
                      </div>
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

                  <div className="space-y-1">
                    <p className="text-xs font-medium">Права доступа:</p>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1">
                        <Checkbox
                          className="h-3 w-3"
                          checked={user.permissions.dashboard}
                          onCheckedChange={() => handleTogglePermission(user.id, "dashboard")}
                          disabled={!canEdit}
                        />
                        <Label className="text-[10px]">Дашборд</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          className="h-3 w-3"
                          checked={user.permissions.deals}
                          onCheckedChange={() => handleTogglePermission(user.id, "deals")}
                          disabled={!canEdit}
                        />
                        <Label className="text-[10px]">CRM</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          className="h-3 w-3"
                          checked={user.permissions.finances}
                          onCheckedChange={() => handleTogglePermission(user.id, "finances")}
                          disabled={!canEdit}
                        />
                        <Label className="text-[10px]">Финансы</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          className="h-3 w-3"
                          checked={user.permissions.constants}
                          onCheckedChange={() => handleTogglePermission(user.id, "constants")}
                          disabled={!canEdit}
                        />
                        <Label className="text-[10px]">Константы</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          className="h-3 w-3"
                          checked={user.permissions.notifications}
                          onCheckedChange={() => handleTogglePermission(user.id, "notifications")}
                          disabled={!canEdit}
                        />
                        <Label className="text-[10px]">Уведомления</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
