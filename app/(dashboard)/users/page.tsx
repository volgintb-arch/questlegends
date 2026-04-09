"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserCreateModal } from "@/components/user-create-modal"
import { UserEditModal } from "@/components/user-edit-modal"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Search, UserPlus, Phone, Calendar, Pencil, Trash2, Users, Building2, Briefcase, ShieldCheck, Music, Mic, PartyPopper, Eye } from "lucide-react"
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

const roleLabels: Record<string, string> = {
  uk: "УК",
  super_admin: "Суперадмин",
  uk_employee: "Сотрудник УК",
  franchisee: "Франчайзи",
  own_point: "Собственная точка",
  admin: "Администратор",
  employee: "Сотрудник",
  animator: "Аниматор",
  host: "Ведущий",
  dj: "DJ",
}

const roleBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
  uk: "default",
  super_admin: "default",
  uk_employee: "secondary",
  franchisee: "secondary",
  own_point: "secondary",
  admin: "outline",
  employee: "outline",
  animator: "outline",
  host: "outline",
  dj: "outline",
}

export default function UsersPage() {
  const router = useRouter()
  const { user, hasPermission, getAuthHeaders } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewingAsId, setViewingAsId] = useState<string | null>(null)

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
      if (user?.role === "uk" || user?.role === "super_admin") {
        filteredUsers = allUsers.filter(
          (u: User) => u.id !== user.id && ["uk_employee", "franchisee", "own_point", "admin", "employee", "animator", "host", "dj"].includes(u.role),
        )
      } else if (user?.role === "franchisee" || user?.role === "own_point") {
        filteredUsers = allUsers.filter(
          (u: User) =>
            u.franchisee?.id === user.franchiseeId && ["admin", "employee", "animator", "host", "dj"].includes(u.role),
        )
      } else if (user?.role === "admin") {
        filteredUsers = allUsers.filter(
          (u: User) =>
            u.franchisee?.id === user.franchiseeId && ["employee", "animator", "host", "dj"].includes(u.role),
        )
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

  const handleViewAs = async (targetUser: User) => {
    try {
      setViewingAsId(targetUser.id)
      const response = await fetch("/api/auth/view-as", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUser.id }),
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem("viewAsToken", data.token)
        localStorage.setItem("viewAsUserId", targetUser.id)
        router.push("/")
      } else {
        toast({ title: "Ошибка просмотра", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error viewing as user:", error)
      toast({ title: "Ошибка", variant: "destructive" })
    } finally {
      setViewingAsId(null)
    }
  }

  // Search filter
  const filterBySearch = (list: User[]) => {
    if (!searchQuery) return list
    const query = searchQuery.toLowerCase()
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query) ||
        u.franchisee?.city?.toLowerCase().includes(query) ||
        u.franchisee?.name?.toLowerCase().includes(query),
    )
  }

  // Categorize users into tabs based on current user's role
  const tabs = useMemo(() => {
    const isUK = user?.role === "uk" || user?.role === "super_admin"
    const isFranchisee = user?.role === "franchisee" || user?.role === "own_point"
    const isAdmin = user?.role === "admin"

    if (isUK) {
      return [
        {
          id: "franchisees",
          label: "Франчайзи",
          icon: Building2,
          roles: ["franchisee", "own_point"],
          users: users.filter((u) => ["franchisee", "own_point"].includes(u.role)),
        },
        {
          id: "uk_staff",
          label: "Сотрудники УК",
          icon: Briefcase,
          roles: ["uk_employee"],
          users: users.filter((u) => u.role === "uk_employee"),
        },
        {
          id: "location_staff",
          label: "Персонал локаций",
          icon: Users,
          roles: ["admin", "employee", "animator", "host", "dj"],
          users: users.filter((u) => ["admin", "employee", "animator", "host", "dj"].includes(u.role)),
        },
      ]
    }

    if (isFranchisee) {
      return [
        {
          id: "admins",
          label: "Администраторы",
          icon: ShieldCheck,
          roles: ["admin"],
          users: users.filter((u) => u.role === "admin"),
        },
        {
          id: "animators",
          label: "Аниматоры",
          icon: PartyPopper,
          roles: ["animator"],
          users: users.filter((u) => u.role === "animator"),
        },
        {
          id: "hosts",
          label: "Ведущие",
          icon: Mic,
          roles: ["host"],
          users: users.filter((u) => u.role === "host"),
        },
        {
          id: "djs",
          label: "Диджеи",
          icon: Music,
          roles: ["dj"],
          users: users.filter((u) => u.role === "dj"),
        },
      ]
    }

    // Admin — single list, no tabs needed
    if (isAdmin) {
      return [
        {
          id: "staff",
          label: "Персонал",
          icon: Users,
          roles: ["employee", "animator", "host", "dj"],
          users: users.filter((u) => ["employee", "animator", "host", "dj"].includes(u.role)),
        },
      ]
    }

    return [{ id: "all", label: "Все", icon: Users, roles: [], users }]
  }, [users, user?.role])

  const renderUserCard = (userItem: User) => {
    const variant = roleBadgeVariants[userItem.role] || "outline"
    const label = roleLabels[userItem.role] || userItem.role
    const isTopAdmin = user?.role === "super_admin" || user?.role === "uk"
    const canViewAs = isTopAdmin && ["franchisee", "own_point", "admin"].includes(userItem.role)

    return (
      <Card key={userItem.id} className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold">{userItem.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant={variant} className="text-[9px] h-4">
                {label}
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
            {canViewAs && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-blue-500 hover:text-blue-600"
                onClick={() => handleViewAs(userItem)}
                disabled={viewingAsId === userItem.id}
                title="Просмотреть как этот пользователь"
              >
                <Eye size={12} />
              </Button>
            )}
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
            <p className="text-[10px] text-muted-foreground">
              {userItem.franchisee.name} — {userItem.franchisee.city}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
            <Calendar size={10} />
            <span>{new Date(userItem.createdAt).toLocaleDateString("ru-RU")}</span>
          </div>
        </div>
      </Card>
    )
  }

  const renderUserGrid = (userList: User[]) => {
    const filtered = filterBySearch(userList)
    if (filtered.length === 0) {
      return (
        <div className="text-center py-8 text-xs text-muted-foreground">
          {searchQuery ? "Не найдено" : "Нет пользователей"}
        </div>
      )
    }
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(renderUserCard)}
      </div>
    )
  }

  const useSingleTab = tabs.length === 1

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
          placeholder="Поиск по имени, телефону, городу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-7 h-8 text-xs"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-xs text-muted-foreground">Загрузка...</div>
      ) : useSingleTab ? (
        // Single tab — no Tabs wrapper needed
        renderUserGrid(tabs[0].users)
      ) : (
        <Tabs defaultValue={tabs[0]?.id} className="space-y-3">
          <TabsList className="h-9">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const count = filterBySearch(tab.users).length
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="text-xs gap-1.5 px-3">
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <Badge variant="secondary" className="text-[9px] h-4 ml-1 min-w-[18px] justify-center">
                    {count}
                  </Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              {renderUserGrid(tab.users)}
            </TabsContent>
          ))}
        </Tabs>
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
