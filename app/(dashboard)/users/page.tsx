"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserCreateModal } from "@/components/user-create-modal"
import { useAuth } from "@/contexts/auth-context"
import { Search, UserPlus, Mail, Phone, Calendar } from "lucide-react"

export default function UsersPage() {
  const { user, hasPermission } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Mock users data
  const users = [
    {
      id: "1",
      name: "Алексей Сидоров",
      role: "franchisee" as const,
      email: "alex@example.com",
      phone: "+7 (999) 111-22-33",
      created_at: "2024-01-15",
      is_active: true,
    },
    {
      id: "2",
      name: "Мария Иванова",
      role: "admin" as const,
      email: "maria@example.com",
      phone: "+7 (999) 222-33-44",
      created_at: "2024-02-10",
      is_active: true,
    },
  ]

  const getRoleBadge = (role: string) => {
    const roleMap = {
      uk: { label: "УК", variant: "default" as const },
      franchisee: { label: "Франчайзи", variant: "secondary" as const },
      admin: { label: "Администратор", variant: "outline" as const },
      animator: { label: "Аниматор", variant: "outline" as const },
      host: { label: "Ведущий", variant: "outline" as const },
      dj: { label: "DJ", variant: "outline" as const },
    }
    return roleMap[role as keyof typeof roleMap] || { label: role, variant: "outline" as const }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Управление пользователями</h1>
          <p className="text-sm text-muted-foreground mt-1">Создавайте и управляйте пользователями системы</p>
        </div>
        {hasPermission("createUsers") && (
          <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
            <UserPlus className="w-4 h-4 mr-2" />
            Создать пользователя
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени, email или телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((userItem) => {
          const roleBadge = getRoleBadge(userItem.role)
          return (
            <Card key={userItem.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{userItem.name}</CardTitle>
                    <Badge variant={roleBadge.variant} className="mt-2">
                      {roleBadge.label}
                    </Badge>
                  </div>
                  {userItem.is_active ? (
                    <Badge variant="default" className="bg-green-500">
                      Активен
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Неактивен</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{userItem.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{userItem.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Создан {userItem.created_at}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <UserCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // TODO: Refresh users list
        }}
      />
    </div>
  )
}
