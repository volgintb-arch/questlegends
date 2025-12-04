"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserCreateModal } from "@/components/user-create-modal"
import { useAuth } from "@/contexts/auth-context"
import { Search, UserPlus, Mail, Phone, Calendar } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  role: string
  phone: string
  telegram?: string
  whatsapp?: string
  description?: string
  isActive: boolean
  createdAt: string
  franchisee?: {
    id: string
    name: string
    city: string
  }
}

export default function UsersPage() {
  const { user, hasPermission } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/users")

      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить пользователей",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const roleMap = {
      uk: { label: "УК", variant: "default" as const },
      uk_employee: { label: "Сотрудник УК", variant: "secondary" as const },
      franchisee: { label: "Франчайзи", variant: "secondary" as const },
      admin: { label: "Администратор", variant: "outline" as const },
      employee: { label: "Сотрудник", variant: "outline" as const },
    }
    return roleMap[role as keyof typeof roleMap] || { label: role, variant: "outline" as const }
  }

  const filteredUsers = users.filter((userItem) => {
    const query = searchQuery.toLowerCase()
    return (
      userItem.name.toLowerCase().includes(query) ||
      userItem.phone.toLowerCase().includes(query) ||
      userItem.franchisee?.city.toLowerCase().includes(query)
    )
  })

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

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка пользователей...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "Пользователи не найдены" : "Нет пользователей"}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((userItem) => {
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
                      {userItem.franchisee && (
                        <p className="text-xs text-muted-foreground mt-1">{userItem.franchisee.city}</p>
                      )}
                    </div>
                    {userItem.isActive ? (
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
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{userItem.phone}</span>
                  </div>
                  {userItem.telegram && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{userItem.telegram}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Создан {new Date(userItem.createdAt).toLocaleDateString("ru-RU")}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <UserCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchUsers()
        }}
      />
    </div>
  )
}
