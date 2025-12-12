"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Phone, Mail, MapPin, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { PersonnelModal } from "@/components/personnel-modal"

interface Staff {
  id: string
  name: string
  role: string
  phone: string
  email: string
  location: string
  schedule: string
  status: "active" | "on_leave" | "inactive"
  joinDate: string
}

interface PersonnelSectionProps {
  role: "uk" | "franchisee" | "admin"
}

export function PersonnelSection({ role }: PersonnelSectionProps) {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [staff, setStaff] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStaff()
  }, [role, user.franchiseeId])

  const fetchStaff = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()

      if (role === "franchisee" || role === "admin") {
        if (user.franchiseeId) {
          params.append("franchiseeId", user.franchiseeId)
        }
        // Get personnel for franchisee/admin
        params.append("role", "animator,host,dj,admin")
      }

      const response = await fetch(`/api/users?${params.toString()}`)
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        const mappedStaff: Staff[] = data.data.map((user: any) => ({
          id: user.id,
          name: user.name,
          role: getRoleLabel(user.role),
          phone: user.phone,
          email: user.email || "Не указан",
          location: user.franchisee?.location || user.city || "Не указана",
          schedule: "Пн-Пт 9:00-18:00",
          status: "active",
          joinDate: user.createdAt,
        }))
        setStaff(mappedStaff)
      }
    } catch (error) {
      console.error("[v0] Error fetching staff:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      animator: "Аниматор",
      host: "Ведущий",
      dj: "DJ",
      admin: "Администратор",
      franchisee: "Управляющий",
      uk: "Директор УК",
      uk_employee: "Сотрудник УК",
    }
    return labels[role] || role
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Активен</Badge>
      case "on_leave":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">В отпуске</Badge>
      case "inactive":
        return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">Неактивен</Badge>
      default:
        return null
    }
  }

  const filteredStaff = staff.filter(
    (s) =>
      (filterStatus === "all" || s.status === filterStatus) &&
      (searchTerm === "" ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const activeCount = staff.filter((s) => s.status === "active").length
  const onLeaveCount = staff.filter((s) => s.status === "on_leave").length

  const getRoleTitle = () => {
    if (role === "franchisee") return "Ваша команда и расписание"
    return `Персонал ${user.franchiseeName || ""}`
  }

  const handleAddStaff = () => {
    setEditingStaff(null)
    setIsModalOpen(true)
  }

  const handleEditStaff = (member: Staff) => {
    setEditingStaff(member)
    setIsModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка персонала...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Персонал / График</h1>
          <p className="text-sm text-muted-foreground mt-1">{getRoleTitle()}</p>
        </div>

        <button
          onClick={handleAddStaff}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span className="text-sm">Добавить сотрудника</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">Всего сотрудников</p>
          <p className="text-2xl font-bold text-foreground">{staff.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">Активные</p>
          <p className="text-2xl font-bold text-green-500">{activeCount}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">В отпуске</p>
          <p className="text-2xl font-bold text-yellow-500">{onLeaveCount}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">Средняя зарплата</p>
          <p className="text-2xl font-bold text-primary">52K ₽</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск сотрудника..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-card border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="on_leave">В отпуске</option>
          <option value="inactive">Неактивные</option>
        </select>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStaff.map((member) => (
          <div
            key={member.id}
            className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{member.name}</h3>
                <p className="text-sm text-primary font-medium">{member.role}</p>
              </div>
              {getStatusBadge(member.status)}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone size={16} />
                <a href={`tel:${member.phone}`} className="hover:text-foreground transition-colors">
                  {member.phone}
                </a>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail size={16} />
                <a href={`mailto:${member.email}`} className="hover:text-foreground transition-colors">
                  {member.email}
                </a>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={16} />
                <span>{member.location}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock size={16} />
                <span>{member.schedule}</span>
              </div>

              <div className="border-t border-border pt-3 mt-3">
                <p className="text-xs text-muted-foreground">
                  Сотрудник с {new Date(member.joinDate).toLocaleDateString("ru-RU")}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleEditStaff(member)}
              className="w-full mt-4 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded text-sm transition-colors"
            >
              Редактировать профиль
            </button>
          </div>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <p className="text-muted-foreground">
            {staff.length === 0 ? "Нет сотрудников. Добавьте первого!" : "Нет сотрудников по данным фильтрам"}
          </p>
        </div>
      )}

      <PersonnelModal
        isOpen={isModalOpen}
        staff={editingStaff}
        onClose={() => setIsModalOpen(false)}
        onSave={async (data) => {
          await fetchStaff()
          setIsModalOpen(false)
        }}
      />
    </div>
  )
}
