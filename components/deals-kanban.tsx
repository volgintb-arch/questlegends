"use client"

import { useState } from "react"
import { Plus, Filter } from "lucide-react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { KanbanColumn } from "./kanban-column"
import { DealEditModal } from "./deal-edit-modal"
import { DealCardFull } from "./deal-card-full"
import { DealCreateModal } from "./deal-create-modal"
import { useAuth } from "@/contexts/auth-context"

interface DealsKanbanProps {
  role: "uk" | "franchisee" | "admin"
}

interface Deal {
  id: string
  title: string
  location: string
  amount: string
  daysOpen: number
  priority?: "high" | "normal"
  participants?: number
  package?: string
  checkPerPerson?: number
  animatorsCount?: number
  animatorRate?: number
  hostRate?: number
  djRate?: number
}

type BoardData = Record<string, Deal[]>

export function DealsKanban({ role }: DealsKanbanProps) {
  const { user } = useAuth()
  const [filterOpen, setFilterOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [viewingDeal, setViewingDeal] = useState<any | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const franchiseeStages = ["Лиды", "Переговоры", "Внесена предоплата (Бронь)", "Игра проведена"]

  const ukStages = ["Лиды", "Переговоры", "Предложение", "Подписано"]

  const stages = role === "uk" ? ukStages : franchiseeStages

  const [boardData, setBoardData] = useState<BoardData>(
    role === "uk"
      ? {
          Лиды: [
            {
              id: "D-001",
              title: "Франчайзи Москва-Юг",
              location: "Москва",
              amount: "500,000 ₽",
              daysOpen: 5,
              priority: "high" as const,
            },
            { id: "D-002", title: "Партнер Урал", location: "Екатеринбург", amount: "350,000 ₽", daysOpen: 12 },
          ],
          Переговоры: [
            {
              id: "D-003",
              title: "Франчайзи СПб-Север",
              location: "Санкт-Петербург",
              amount: "450,000 ₽",
              daysOpen: 8,
            },
            {
              id: "D-004",
              title: "Премиум партнер",
              location: "Казань",
              amount: "600,000 ₽",
              daysOpen: 3,
              priority: "high" as const,
            },
          ],
          Предложение: [{ id: "D-006", title: "Франчайзи Тверь", location: "Тверь", amount: "300,000 ₽", daysOpen: 2 }],
          Подписано: [
            { id: "D-008", title: "Франчайзи Ростов", location: "Ростов-на-Дону", amount: "480,000 ₽", daysOpen: 20 },
          ],
        }
      : {
          Лиды: [
            {
              id: "C-001",
              title: "Корпоратив TechCorp",
              location: user.franchiseeName,
              amount: "45,000 ₽",
              daysOpen: 3,
              participants: 15,
              package: "Премиум",
              checkPerPerson: 0,
              animatorsCount: 0,
              animatorRate: 0,
              hostRate: 0,
              djRate: 0,
            },
            {
              id: "C-002",
              title: "День рождения",
              location: user.franchiseeName,
              amount: "12,000 ₽",
              daysOpen: 7,
              participants: 8,
              package: "Стандарт",
              checkPerPerson: 0,
              animatorsCount: 0,
              animatorRate: 0,
              hostRate: 0,
              djRate: 0,
            },
          ],
          Переговоры: [
            {
              id: "C-003",
              title: "Школьное мероприятие",
              location: user.franchiseeName,
              amount: "28,000 ₽",
              daysOpen: 5,
              participants: 20,
              package: "Образовательный",
              checkPerPerson: 0,
              animatorsCount: 0,
              animatorRate: 0,
              hostRate: 0,
              djRate: 0,
            },
          ],
          "Внесена предоплата (Бронь)": [
            {
              id: "C-004",
              title: "Свадебный квест",
              location: user.franchiseeName,
              amount: "65,000 ₽",
              daysOpen: 2,
              participants: 12,
              package: "VIP",
              priority: "high" as const,
              checkPerPerson: 0,
              animatorsCount: 0,
              animatorRate: 0,
              hostRate: 0,
              djRate: 0,
            },
          ],
          "Игра проведена": [
            {
              id: "C-005",
              title: "Корпоратив StartUp Inc",
              location: user.franchiseeName,
              amount: "38,000 ₽",
              daysOpen: 15,
              participants: 10,
              package: "Стандарт",
              checkPerPerson: 0,
              animatorsCount: 0,
              animatorRate: 0,
              hostRate: 0,
              djRate: 0,
            },
          ],
        },
  )

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result

    // Dropped outside any droppable
    if (!destination) {
      return
    }

    // Dropped in same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const sourceStage = source.droppableId
    const destStage = destination.droppableId

    const newBoardData = { ...boardData }

    // Remove from source
    const [movedDeal] = newBoardData[sourceStage].splice(source.index, 1)

    // Add to destination
    newBoardData[destStage].splice(destination.index, 0, movedDeal)

    setBoardData(newBoardData)

    // Trigger webhook for game completion
    if (destStage === "Игра проведена" && role !== "uk") {
      console.log("[v0] Triggering webhook for game completion:", draggableId)
      // TODO: Send webhook to backend for Scenario C2 (checklist link to admin/host)
    }
  }

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal)
    setIsEditModalOpen(true)
  }

  const handleViewDeal = (deal: Deal) => {
    // Convert simple Deal to detailed DealData format
    const detailedDeal = {
      ...deal,
      amount: Number.parseFloat(deal.amount.replace(/[^\d]/g, "")),
      source: "Сайт",
      createdAt: new Date(),
      stage: "Лиды",
      participants: deal.participants || 0,
      checkPerPerson: (deal as any).checkPerPerson || 0,
      animatorsCount: (deal as any).animatorsCount || 0,
      animatorRate: (deal as any).animatorRate || 0,
      hostRate: (deal as any).hostRate || 0,
      djRate: (deal as any).djRate || 0,
      contact: {
        name: "Иван Иванов",
        phone: "+7 (999) 123-45-67",
        email: "client@example.com",
        company: "ООО Компания",
      },
      responsible: user.name,
      activities: [
        {
          id: "1",
          type: "event" as const,
          timestamp: new Date(),
          user: "Система",
          content: "Сделка создана",
        },
      ],
      tasks: [],
    }
    setViewingDeal(detailedDeal)
    setIsViewModalOpen(true)
  }

  const handleSaveDeal = (updatedDeal: Deal) => {
    const newBoardData = { ...boardData }
    Object.keys(newBoardData).forEach((stage) => {
      newBoardData[stage] = newBoardData[stage].map((d) => (d.id === updatedDeal.id ? updatedDeal : d))
    })
    setBoardData(newBoardData)
  }

  const handleCreateDeal = (newDeal: Deal) => {
    const dealWithDefaults = {
      ...newDeal,
      checkPerPerson: (newDeal as any).checkPerPerson || 0,
      animatorsCount: (newDeal as any).animatorsCount || 0,
      animatorRate: (newDeal as any).animatorRate || 0,
      hostRate: (newDeal as any).hostRate || 0,
      djRate: (newDeal as any).djRate || 0,
    }

    const newBoardData = { ...boardData }
    const firstStage = stages[0]

    if (!newBoardData[firstStage]) {
      newBoardData[firstStage] = []
    }

    newBoardData[firstStage].unshift(dealWithDefaults)
    setBoardData(newBoardData)
  }

  const getRoleTitle = () => {
    if (role === "uk") return "Управление франчайзи и сделками"
    if (role === "franchisee") return "Ваши активные клиенты"
    return `Клиенты ${user.franchiseeName}`
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Сделки / CRM</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{getRoleTitle()}</p>
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-colors text-sm">
            <Filter className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            <span className="text-xs sm:text-sm">Фильтр</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            <span className="text-xs sm:text-sm hidden sm:inline">Новая сделка</span>
            <span className="text-xs sm:text-sm sm:hidden">Создать</span>
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-3 sm:gap-4 min-w-max">
            {stages.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                deals={boardData[stage] || []}
                dealCount={(boardData[stage] || []).length}
                onEditDeal={handleEditDeal}
                onViewDeal={handleViewDeal}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Всего сделок</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{Object.values(boardData).flat().length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Высокие приоритеты</p>
          <p className="text-xl sm:text-2xl font-bold text-accent">
            {
              Object.values(boardData)
                .flat()
                .filter((d) => d.priority === "high").length
            }
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Сумма в работе</p>
          <p className="text-base sm:text-lg font-bold text-primary">{role === "uk" ? "7.2M ₽" : "188K ₽"}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Конверсия</p>
          <p className="text-xl sm:text-2xl font-bold text-green-500">{role === "uk" ? "34%" : "68%"}</p>
        </div>
      </div>

      <DealEditModal
        deal={editingDeal}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingDeal(null)
        }}
        onSave={handleSaveDeal}
        role={role}
      />

      {viewingDeal && (
        <DealCardFull
          deal={viewingDeal}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false)
            setViewingDeal(null)
          }}
          onUpdate={(updatedDeal) => {
            console.log("[v0] Deal updated:", updatedDeal)
            // Update deal in boardData if needed
          }}
          role={role}
        />
      )}

      <DealCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateDeal}
        role={role}
      />
    </div>
  )
}
