"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, Trash2, Shield } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

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
  const [users, setUsers] = useState<AccessUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    permissions: { dashboard: false, deals: false, finances: false, constants: false, notifications: false },
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/permissions")
      if (!response.ok) throw new Error("Failed to fetch users")
      const data = await response.json()

      const formattedUsers = data.users.map((u: any) => ({
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

  const handleAddUser = async () => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUser.name,
          phone: newUser.phone,
          telegram: newUser.email,
          role: "uk_employee",
          description: newUser.role,
        }),
      })

      if (!response.ok) throw new Error("Failed to create user")

      await fetchUsers()
      setIsAddModalOpen(false)
      setNewUser({
        name: "",
        email: "",
        phone: "",
        role: "",
        permissions: { dashboard: false, deals: false, finances: false, constants: false, notifications: false },
      })
    } catch (error) {
      console.error("[v0] Error creating user:", error)
      alert("Ошибка при создании пользователя")
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
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch(`/api/users/${userId}`, { method: "DELETE" })
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Управление Доступом УК</h1>
          <p className="text-muted-foreground mt-1">Управление правами доступа сотрудников управляющей компании</p>
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus size={18} />
              Добавить Пользователя
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Добавить Нового Пользователя УК</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Имя</Label>
                  <Input
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Иван Иванов"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="ivan@questlegends.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Должность</Label>
                  <Input
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    placeholder="Аналитик"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <p className="font-medium text-sm">Права доступа:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={newUser.permissions.dashboard}
                      onCheckedChange={(checked) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, dashboard: checked as boolean },
                        })
                      }
                    />
                    <Label>Главная / Дашборд</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={newUser.permissions.deals}
                      onCheckedChange={(checked) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, deals: checked as boolean },
                        })
                      }
                    />
                    <Label>Сделки / CRM</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={newUser.permissions.finances}
                      onCheckedChange={(checked) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, finances: checked as boolean },
                        })
                      }
                    />
                    <Label>Финансы / ERP</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={newUser.permissions.constants}
                      onCheckedChange={(checked) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, constants: checked as boolean },
                        })
                      }
                    />
                    <Label>Администрирование / Константы</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={newUser.permissions.notifications}
                      onCheckedChange={(checked) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, notifications: checked as boolean },
                        })
                      }
                    />
                    <Label>Уведомления / Сбои</Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleAddUser}>Добавить</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
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
        ))}
      </div>
    </div>
  )
}
