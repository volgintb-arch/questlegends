"use client"

import { useState } from "react"
import { Shield } from "lucide-react"

interface Permission {
  id: string
  name: string
  description: string
}

interface CustomRole {
  id: string
  name: string
  description: string
  permissions: string[]
  color: string
}

interface StaffAccess {
  id: string
  name: string
  roleId: string // Changed from role string to roleId
  customPermissions?: string[] // Optional custom permissions override
}

export function AccessManagementAdmin() {
  // Available permissions
  const availablePermissions: Permission[] = [
    { id: "view_deals", name: "Просмотр сделок", description: "Доступ к канбану CRM" },
    { id: "edit_deals", name: "Редактирование сделок", description: "Изменение и перемещение сделок" },
    { id: "view_finances", name: "Просмотр финансов", description: "Доступ к финансовым данным" },
    { id: "add_expenses", name: "Ввод расходов", description: "Добавление новых расходов" },
    { id: "manage_staff", name: "Управление персоналом", description: "Назначение сотрудников на игры" },
    { id: "view_kb", name: "База знаний", description: "Доступ к документации" },
  ]

  const [staffAccess, setStaffAccess] = useState<StaffAccess[]>([
    { id: "1", name: "Иванов Иван", roleId: "role-senior-admin" },
    { id: "2", name: "Петрова Анна", roleId: "role-admin" },
    { id: "3", name: "Сидоров Петр", roleId: "role-host" },
  ])

  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)

  const getStaffPermissions = (staff: StaffAccess): string[] => {
    if (staff.customPermissions) {
      return staff.customPermissions
    }
    const role = customRoles.find((r) => r.id === staff.roleId)
    return role?.permissions || []
  }

  const getRoleName = (roleId: string): string => {
    return customRoles.find((r) => r.id === roleId)?.name || "Неизвестная роль"
  }

  const togglePermission = (staffId: string, permissionId: string) => {
    setStaffAccess((prev) =>
      prev.map((staff) => {
        if (staff.id === staffId) {
          const currentPermissions = getStaffPermissions(staff)
          const hasPermission = currentPermissions.includes(permissionId)
          return {
            ...staff,
            customPermissions: hasPermission
              ? currentPermissions.filter((p) => p !== permissionId)
              : [...currentPermissions, permissionId],
          }
        }
        return staff
      }),
    )
  }

  const customRoles: CustomRole[] = [
    {
      id: "role-senior-admin",
      name: "Старший Администратор",
      description: "Полный доступ к управлению локацией",
      permissions: ["view_deals", "edit_deals", "view_finances", "add_expenses", "manage_staff", "view_kb"],
      color: "blue",
    },
    {
      id: "role-admin",
      name: "Администратор",
      description: "Базовый доступ к операциям",
      permissions: ["view_deals", "view_finances", "view_kb"],
      color: "green",
    },
    {
      id: "role-host",
      name: "Ведущий",
      description: "Доступ к сделкам и документации",
      permissions: ["view_deals", "view_kb"],
      color: "purple",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Управление Доступом</h1>
          <p className="text-muted-foreground">Информация о правах доступа</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <Shield size={64} className="mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Недостаточно прав</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Управление доступами и создание ролей доступно только для роли Франчайзи. Как администратор вы можете
          управлять только созданием пользователей-персонала.
        </p>
      </div>
    </div>
  )
}
