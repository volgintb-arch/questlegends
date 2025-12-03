"use client"

import { useState } from "react"
import { User, Mail, Shield, Check, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface AccessRight {
  id: string
  name: string
  description: string
  enabled: boolean
}

interface DelegatedUser {
  id: string
  name: string
  email: string
  role: string
  rights: AccessRight[]
  status: "active" | "pending" | "revoked"
}

export function AccessManagementFranchisee() {
  const { user } = useAuth()
  const [users, setUsers] = useState<DelegatedUser[]>([
    {
      id: "U-001",
      name: "Анна Петрова",
      email: "anna.petrova@questlegends.ru",
      role: "Администратор",
      status: "active",
      rights: [
        { id: "crm", name: "CRM", description: "Управление сделками и клиентами", enabled: true },
        { id: "expenses", name: "Расходы", description: "Управление расходами локации", enabled: true },
        { id: "schedules", name: "График", description: "Управление графиком сотрудников", enabled: true },
        { id: "kb", name: "База Знаний", description: "Доступ к документации (всегда включено)", enabled: true },
        { id: "users", name: "Пользователи", description: "Управление пользователями-персоналом", enabled: false },
      ],
    },
    {
      id: "U-002",
      name: "Иван Козлов",
      email: "ivan.kozlov@questlegends.ru",
      role: "Администратор",
      status: "active",
      rights: [
        { id: "crm", name: "CRM", description: "Управление сделками и клиентами", enabled: false },
        { id: "expenses", name: "Расходы", description: "Управление расходами локации", enabled: false },
        { id: "schedules", name: "График", description: "Управление графиком сотрудников", enabled: true },
        { id: "kb", name: "База Знаний", description: "Доступ к документации (всегда включено)", enabled: true },
        { id: "users", name: "Пользователи", description: "Управление пользователями-персоналом", enabled: true },
      ],
    },
  ])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const handleToggleRight = (userId: string, rightId: string) => {
    if (rightId === "kb") return

    setUsers(
      users.map((u) =>
        u.id === userId
          ? {
              ...u,
              rights: u.rights.map((r) => (r.id === rightId ? { ...r, enabled: !r.enabled } : r)),
            }
          : u,
      ),
    )
  }

  const handleRevokeAccess = (userId: string) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, status: "revoked" as const } : u)))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Управление Доступом</h1>
          <p className="text-sm text-muted-foreground mt-1">Настройка прав доступа для администраторов</p>
        </div>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {users.map((delegatedUser) => (
          <div
            key={delegatedUser.id}
            className={`bg-card border rounded-lg p-5 ${
              delegatedUser.status === "revoked"
                ? "border-destructive/50 opacity-60"
                : selectedUser === delegatedUser.id
                  ? "border-primary"
                  : "border-border"
            }`}
          >
            {/* User Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-full">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{delegatedUser.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Mail size={12} className="text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{delegatedUser.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    delegatedUser.status === "active"
                      ? "bg-green-500/20 text-green-500"
                      : delegatedUser.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {delegatedUser.status === "active"
                    ? "Активен"
                    : delegatedUser.status === "pending"
                      ? "Ожидает"
                      : "Отозван"}
                </span>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
              <Shield size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Роль:</span>
              <span className="text-xs font-semibold text-foreground">{delegatedUser.role}</span>
            </div>

            {/* Access Rights */}
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Права доступа:</p>
              {delegatedUser.rights.map((right) => (
                <div key={right.id} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{right.name}</p>
                    <p className="text-xs text-muted-foreground">{right.description}</p>
                  </div>
                  <button
                    onClick={() => handleToggleRight(delegatedUser.id, right.id)}
                    disabled={delegatedUser.status === "revoked" || right.id === "kb"}
                    className={`p-1.5 rounded transition-colors ${
                      right.enabled
                        ? "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    } ${right.id === "kb" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {right.enabled ? <Check size={16} /> : <X size={16} />}
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            {delegatedUser.status === "active" && (
              <button
                onClick={() => handleRevokeAccess(delegatedUser.id)}
                className="w-full px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg text-sm transition-colors"
              >
                Отозвать доступ
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
        <p className="text-sm text-foreground font-medium mb-2">Важная информация</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Управление правами доступа доступно только для администраторов вашей локации</li>
          <li>База Знаний всегда доступна для всех администраторов и не может быть отключена</li>
          <li>Для создания новых пользователей перейдите во вкладку "Пользователи"</li>
          <li>Отзыв доступа происходит мгновенно и может быть восстановлен в любой момент</li>
          <li>Вы можете выдавать следующие модули: CRM, Расходы, График, База знаний, Пользователи</li>
        </ul>
      </div>
    </div>
  )
}
