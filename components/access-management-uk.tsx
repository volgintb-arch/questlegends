"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Shield } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/contexts/auth-context"

interface AccessUser {
  id: string
  name: string
  email: string
  phone: string
  role: string
  permissions: {
    dashboard: boolean
    deals: boolean
    finances: boolean
    constants: boolean
    notifications: boolean
  }
  status: "active" | "inactive"
}

export function AccessManagementUK() {
  const { user: currentUser, getAuthHeaders } = useAuth()
  const [users, setUsers] = useState<AccessUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
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
        .filter((u: any) => u.role === "uk_employee" || u.role === "uk")
        .map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.telegram || u.phone,
          phone: u.phone,
          role: u.description || "Сотрудник УК",
          permissions: {
            dashboard: u.userPermissions?.canViewDashboard ?? true,
            deals: u.userPermissions?.canViewDeals ?? false,
            finances: u.userPermissions?.canViewFinances ?? false,
            constants: u.userPermissions?.canManageConstants ?? false,
            notifications: u.userPermissions?.canViewNotifications ?? true,
          },
          status: u.isActive ? "active" : "inactive",
        }))

      setUsers(formattedUsers)
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
    } finally {
      setLoading(false)
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Вы уверены, что хотите удалить доступ этого пользователя?")) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeaders(),
        },
      })
      if (!response.ok) throw new Error("Failed to delete user")

      setUsers(users.filter((user) => user.id !== userId))
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
      alert("Ошибка при удалении пользователя")
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Загрузка...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Управление Доступом УК</h1>
        <p className="text-muted-foreground mt-1">Управление правами доступа сотрудников управляющей компании</p>
      </div>

      <div className="grid gap-4">
        {users.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Нет сотрудников УК</h3>
            <p className="text-muted-foreground">В системе пока нет зарегистрированных сотрудников УК</p>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="text-primary" size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Email:</span> {user.email}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Телефон:</span> {user.phone}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Права доступа:</p>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={user.permissions.dashboard}
                          onCheckedChange={() => handleTogglePermission(user.id, "dashboard")}
                        />
                        <Label className="text-sm">Дашборд</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={user.permissions.deals}
                          onCheckedChange={() => handleTogglePermission(user.id, "deals")}
                        />
                        <Label className="text-sm">CRM</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={user.permissions.finances}
                          onCheckedChange={() => handleTogglePermission(user.id, "finances")}
                        />
                        <Label className="text-sm">Финансы</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={user.permissions.constants}
                          onCheckedChange={() => handleTogglePermission(user.id, "constants")}
                        />
                        <Label className="text-sm">Константы</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={user.permissions.notifications}
                          onCheckedChange={() => handleTogglePermission(user.id, "notifications")}
                        />
                        <Label className="text-sm">Уведомления</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteUser(user.id)}
                  className="text-destructive"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
