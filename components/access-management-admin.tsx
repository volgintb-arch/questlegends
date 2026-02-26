"use client"

import { useState, useEffect } from "react"
import { Shield, Check, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface Permission {
  id: string
  name: string
  description: string
}

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  permissions: {
    viewDeals: boolean
    editDeals: boolean
    viewFinances: boolean
    addExpenses: boolean
    manageStaff: boolean
    viewKb: boolean
  }
  status: "active" | "inactive"
}

export function AccessManagementAdmin() {
  const { user: currentUser, getAuthHeaders } = useAuth()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  const availablePermissions: Permission[] = [
    { id: "viewDeals", name: "Просмотр сделок", description: "Доступ к канбану CRM" },
    { id: "editDeals", name: "Редактирование сделок", description: "Изменение и перемещение сделок" },
    { id: "viewFinances", name: "Просмотр финансов", description: "Доступ к финансовым данным" },
    { id: "addExpenses", name: "Ввод расходов", description: "Добавление новых расходов" },
    { id: "manageStaff", name: "Управление персоналом", description: "Назначение сотрудников на игры" },
    { id: "viewKb", name: "База знаний", description: "Доступ к документации (всегда включено)" },
  ]

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/permissions?franchiseeId=${currentUser?.franchiseeId}`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error("Failed to fetch staff")
      const data = await response.json()

      const formattedStaff = data.users
        .filter(
          (u: any) =>
            u.role === "employee" &&
            u.franchiseeId === currentUser?.franchiseeId &&
            ["animator", "host", "dj"].some((role) => u.description?.toLowerCase().includes(role)),
        )
        .map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.telegram || u.phone,
          phone: u.phone,
          role: u.description || "Персонал",
          permissions: {
            viewDeals: u.userPermissions?.canViewDeals ?? false,
            editDeals: u.userPermissions?.canEditDeals ?? false,
            viewFinances: u.userPermissions?.canViewFinances ?? false,
            addExpenses: u.userPermissions?.canAddExpenses ?? false,
            manageStaff: u.userPermissions?.canManageStaff ?? false,
            viewKb: true,
          },
          status: u.isActive ? "active" : "inactive",
        }))

      setStaff(formattedStaff)
    } catch (error) {
      console.error("[v0] Error fetching staff:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePermission = async (staffId: string, permission: keyof StaffMember["permissions"]) => {
    if (permission === "viewKb") return

    const member = staff.find((s) => s.id === staffId)
    if (!member) return

    const newPermissions = {
      ...member.permissions,
      [permission]: !member.permissions[permission],
    }

    try {
      const permissionMap = {
        viewDeals: "canViewDeals",
        editDeals: "canEditDeals",
        viewFinances: "canViewFinances",
        addExpenses: "canAddExpenses",
        manageStaff: "canManageStaff",
        viewKb: "canViewKb",
      }

      const response = await fetch("/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          userId: staffId,
          permissions: {
            [permissionMap[permission]]: newPermissions[permission],
          },
        }),
      })

      if (!response.ok) throw new Error("Failed to update permissions")

      setStaff(staff.map((s) => (s.id === staffId ? { ...s, permissions: newPermissions } : s)))
      toast.success("Права доступа обновлены")
    } catch (error) {
      console.error("[v0] Error updating permissions:", error)
      toast.error("Ошибка при обновлении прав доступа")
    }
  }

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этого сотрудника?")) return

    try {
      const response = await fetch(`/api/users/${staffId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error("Failed to delete staff")

      setStaff(staff.filter((s) => s.id !== staffId))
      toast.success("Сотрудник удалён")
    } catch (error) {
      console.error("[v0] Error deleting staff:", error)
      toast.error("Ошибка при удалении сотрудника")
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Загрузка...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Управление Доступом</h1>
        <p className="text-muted-foreground">Управление правами доступа персонала вашей локации</p>
      </div>

      <div className="grid gap-4">
        {staff.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Нет сотрудников</h3>
            <p className="text-muted-foreground">В вашей локации пока нет зарегистрированных сотрудников</p>
          </Card>
        ) : (
          staff.map((member) => (
            <Card key={member.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="text-primary" size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Телефон:</span> {member.phone}
                    </div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          member.status === "active" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                        }`}
                      >
                        {member.status === "active" ? "Активен" : "Неактивен"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Права доступа:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {availablePermissions.map((perm) => {
                        const isEnabled = member.permissions[perm.id as keyof typeof member.permissions]
                        return (
                          <div key={perm.id} className="flex items-center justify-between">
                            <Label className="text-sm">{perm.name}</Label>
                            <button
                              onClick={() =>
                                handleTogglePermission(member.id, perm.id as keyof StaffMember["permissions"])
                              }
                              disabled={perm.id === "viewKb"}
                              className={`p-1.5 rounded transition-colors ${
                                isEnabled ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                              } ${perm.id === "viewKb" ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
                            >
                              {isEnabled ? <Check size={16} /> : <X size={16} />}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteStaff(member.id)}
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
