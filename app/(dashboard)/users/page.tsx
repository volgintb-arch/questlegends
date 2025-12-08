"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserCreateModal } from "@/components/user-create-modal"
import { UserEditModal } from "@/components/user-edit-modal"
import { useAuth } from "@/contexts/auth-context"
import { Search, UserPlus, Phone, Calendar, Pencil, Trash2 } from "lucide-react"
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
  const { user, hasPermission, getAuthHeaders } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/users", {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const data = await response.json()
      const allUsers = Array.isArray(data) ? data : data.data || []

      // Filter based on current user role
      let filteredUsers = allUsers
      if (user?.role === "uk") {
        filteredUsers = allUsers.filter((u: User) => u.role === "uk_employee" || u.role === "franchisee")
      } else if (user?.role === "franchisee") {
        filteredUsers = allUsers.filter(
          (u: User) =>
            u.franchisee?.id === user.franchiseeId && ["admin", "employee", "animator", "host", "dj"].includes(u.role),
        )
      } else if (user?.role === "super_admin") {
        // Super admin sees everyone except themselves
        filteredUsers = allUsers.filter((u: User) => u.id !== user.id)
      }

      setUsers(filteredUsers)
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Удалить этого пользователя?")) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        fetchUsers()
        toast({ title: "Пользователь удален" })
      } else {
        const error = await response.json()
        toast({ title: "Ошибка", description: error.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
    }
  }

  const getRoleBadge = (role: string) => {
    const roleMap = {
      uk: { label: "УК", variant: "default" as const },
      uk_employee: { label: "Сотрудник УК", variant: "secondary" as const },
      franchisee: { label: "Франчайзи", variant: "secondary" as const },
      admin: { label: "Администратор", variant: "outline" as const },
      employee: { label: "Сотрудник", variant: "outline" as const },
      animator: { label: "Аниматор", variant: "outline" as const },
      host: { label: "Ведущий", variant: "outline" as const },
      dj: { label: "DJ", variant: "outline" as const },
    }
    return roleMap[role as keyof typeof roleMap] || { label: role, variant: "outline" as const }
  }

  const filteredUsers = users.filter((userItem) => {
    const query = searchQuery.toLowerCase()
    return (
      userItem.name.toLowerCase().includes(query) ||
      userItem.phone?.toLowerCase().includes(query) ||
      userItem.franchisee?.city.toLowerCase().includes(query)
    )
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">Пользователи</h1>
          <p className="text-xs text-muted-foreground">Управление пользователями системы</p>
        </div>
        {hasPermission("createUsers") && (
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-8 text-xs">
            <UserPlus className="w-3 h-3 mr-1" />
            Создать
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <Input
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-7 h-8 text-xs"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-xs text-muted-foreground">Загрузка...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted-foreground">
          {searchQuery ? "Не найдено" : "Нет пользователей"}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((userItem) => {
            const roleBadge = getRoleBadge(userItem.role)
            return (
              <Card key={userItem.id} className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold">{userItem.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant={roleBadge.variant} className="text-[9px] h-4">
                        {roleBadge.label}
                      </Badge>
                      {userItem.isActive ? (
                        <Badge variant="default" className="text-[9px] h-4 bg-green-500">
                          Активен
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] h-4">
                          Неактивен
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingUser(userItem)}>
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleDeleteUser(userItem.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone size={10} />
                    <span>{userItem.phone}</span>
                  </div>
                  {userItem.franchisee && (
                    <p className="text-[10px] text-muted-foreground">{userItem.franchisee.city}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                    <Calendar size={10} />
                    <span>{new Date(userItem.createdAt).toLocaleDateString("ru-RU")}</span>
                  </div>
                </div>
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

      {editingUser && (
        <UserEditModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          onUpdated={() => {
            fetchUsers()
            setEditingUser(null)
          }}
        />
      )}
    </div>
  )
}
