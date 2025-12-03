"use client"

import { useState } from "react"
import { Plus, Search, Phone, Mail, MapPin, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { PersonnelModal } from "@/components/personnel-modal" // Assuming PersonnelModal is imported from the correct path

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

  const franchiseeStaff: Staff[] = [
    {
      id: "F-001",
      name: "Алексей Сидоров",
      role: "Управляющий",
      phone: "+7 (999) 111-22-33",
      email: "alex@franchisee.ru",
      location: "Москва",
      schedule: "Пн-Пт 9:00-20:00",
      status: "active",
      joinDate: "2022-06-01",
    },
    {
      id: "F-002",
      name: "Елена Морозова",
      role: "Специалист по обслуживанию",
      phone: "+7 (999) 222-33-44",
      email: "elena@franchisee.ru",
      location: "Москва",
      schedule: "Пн-Сб 10:00-18:00",
      status: "active",
      joinDate: "2023-01-15",
    },
    {
      id: "F-003",
      name: "Дмитрий Никитин",
      role: "Консультант",
      phone: "+7 (999) 333-44-55",
      email: "dmitry@franchisee.ru",
      location: "Москва",
      schedule: "Пн-Пт 11:00-19:00",
      status: "active",
      joinDate: "2023-04-10",
    },
    {
      id: "F-004",
      name: "Татьяна Кузнецова",
      role: "Администратор",
      phone: "+7 (999) 444-55-66",
      email: "tatiana@franchisee.ru",
      location: "Москва",
      schedule: "Пн-Пт 9:00-18:00",
      status: "on_leave",
      joinDate: "2023-02-01",
    },
  ]

  const adminStaff: Staff[] = [
    {
      id: "A-001",
      name: "Дмитрий Админ",
      role: "Администратор франчайзи",
      phone: "+7 (999) 555-66-77",
      email: "admin@kazanka.ru",
      location: "Казань",
      schedule: "Пн-Пт 9:00-18:00",
      status: "active",
      joinDate: "2022-01-10",
    },
    {
      id: "A-002",
      name: "Ольга Сергеева",
      role: "Менеджер направления",
      phone: "+7 (999) 666-77-88",
      email: "olga@kazanka.ru",
      location: "Казань",
      schedule: "Пн-Пт 10:00-19:00",
      status: "active",
      joinDate: "2023-03-15",
    },
    {
      id: "A-003",
      name: "Игорь Петухов",
      role: "Специалист по обслуживанию",
      phone: "+7 (999) 777-88-99",
      email: "igor@kazanka.ru",
      location: "Казань",
      schedule: "Пн-Сб 11:00-20:00",
      status: "active",
      joinDate: "2023-05-01",
    },
    {
      id: "A-004",
      name: "Виктория Климова",
      role: "Специалист по обслуживанию",
      phone: "+7 (999) 888-99-00",
      email: "victoria@kazanka.ru",
      location: "Казань",
      schedule: "Пн-Пт 12:00-21:00",
      status: "active",
      joinDate: "2023-07-20",
    },
    {
      id: "A-005",
      name: "Сергей Морозов",
      role: "Консультант",
      phone: "+7 (999) 999-00-11",
      email: "sergey@kazanka.ru",
      location: "Казань",
      schedule: "Пн-Чт 10:00-18:00, Пт-Вс 14:00-22:00",
      status: "on_leave",
      joinDate: "2023-08-15",
    },
  ]

  const staff = role === "franchisee" ? franchiseeStaff : adminStaff

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
    return `Персонал ${user.franchiseeName}`
  }

  const handleAddStaff = () => {
    setEditingStaff(null)
    setIsModalOpen(true)
  }

  const handleEditStaff = (member: Staff) => {
    setEditingStaff(member)
    setIsModalOpen(true)
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
          <p className="text-muted-foreground">Нет сотрудников по данным фильтрам</p>
        </div>
      )}

      <PersonnelModal
        isOpen={isModalOpen}
        staff={editingStaff}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => {
          console.log("[v0] Saving personnel:", data)
          // Backend API call: POST /api/personnel or PUT /api/personnel/:id
          setIsModalOpen(false)
        }}
      />
    </div>
  )
}
