"use client"

import { useState, useEffect, useMemo } from "react"
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
  clientName?: string
  clientPhone?: string
  stage?: string
}

type BoardData = Record<string, Deal[]>

export function DealsKanban({ role }: DealsKanbanProps) {
  const { user, getAuthHeaders } = useAuth()
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [viewingDeal, setViewingDeal] = useState<any | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const stages = useMemo(() => {
    const franchiseeStages = ["Лиды", "Переговоры", "Внесена предоплата (Бронь)", "Игра проведена"]
    const ukStages = ["Лиды", "Переговоры", "Предложение", "Подписано"]
    return role === "uk" ? ukStages : franchiseeStages
  }, [role])

  const [boardData, setBoardData] = useState<BoardData>({})

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        console.log("[v0] Fetching deals for role:", role, "user:", user?.id)

        const params = new URLSearchParams()
        if (user?.franchiseeId && role !== "uk") {
          params.append("franchiseeId", user.franchiseeId)
        }

        const response = await fetch(`/api/deals?${params.toString()}`, {
          headers: getAuthHeaders(),
        })
        console.log("[v0] Response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Failed to fetch deals:", errorText)
          throw new Error("Failed to fetch deals")
        }

        const responseData = await response.json()
        console.log("[v0] Response data structure:", Object.keys(responseData))

        const deals = responseData.data || responseData
        console.log("[v0] Fetched deals count:", deals.length)

        const grouped: BoardData = {}
        stages.forEach((stage) => {
          grouped[stage] = []
        })

        deals.forEach((deal: any) => {
          const stageName = stages.find((s) => s === deal.stage) || stages[0]
          grouped[stageName].push({
            id: deal.id,
            title: deal.clientName || "Без названия",
            location: deal.franchisee?.city || user?.franchiseeName || "",
            amount: deal.price ? `${deal.price.toLocaleString()} ₽` : "0 ₽",
            daysOpen: Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            participants: deal.participants || 0,
            package: deal.packageType || "",
            clientName: deal.clientName,
            clientPhone: deal.clientPhone,
            stage: deal.stage,
          })
        })

        console.log(
          "[v0] Grouped deals:",
          Object.keys(grouped).map((k) => `${k}: ${grouped[k].length}`),
        )
        setBoardData(grouped)
      } catch (error) {
        console.error("[v0] Error fetching deals:", error)
        const emptyBoard: BoardData = {}
        stages.forEach((stage) => {
          emptyBoard[stage] = []
        })
        setBoardData(emptyBoard)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDeals()
    }
  }, [user, role, stages, getAuthHeaders])

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceStage = source.droppableId
    const destStage = destination.droppableId

    const newBoardData = { ...boardData }
    const [movedDeal] = newBoardData[sourceStage].splice(source.index, 1)
    newBoardData[destStage].splice(destination.index, 0, movedDeal)

    setBoardData(newBoardData)

    try {
      await fetch(`/api/deals/${draggableId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ stage: destStage }),
      })
    } catch (error) {
      console.error("[v0] Error updating deal stage:", error)
    }
  }

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal)
    setIsEditModalOpen(true)
  }

  const handleViewDeal = async (deal: Deal) => {
    try {
      const response = await fetch(`/api/deals/${deal.id}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const fullDeal = await response.json()
        setViewingDeal({
          ...fullDeal,
          amount: fullDeal.price || 0,
          participants: fullDeal.participants || 0,
          contact: {
            name: fullDeal.clientName || "",
            phone: fullDeal.clientPhone || "",
            email: fullDeal.clientEmail || "",
            company: fullDeal.clientCompany || "",
          },
          responsible: fullDeal.responsibleManager || user?.name || "",
          activities: fullDeal.activities || [],
          tasks: fullDeal.tasks || [],
        })
        setIsViewModalOpen(true)
      }
    } catch (error) {
      console.error("[v0] Error loading deal details:", error)
    }
  }

  const handleSaveDeal = (updatedDeal: Deal) => {
    const newBoardData = { ...boardData }
    Object.keys(newBoardData).forEach((stage) => {
      newBoardData[stage] = newBoardData[stage].map((d) => (d.id === updatedDeal.id ? updatedDeal : d))
    })
    setBoardData(newBoardData)
  }

  const handleCreateDeal = async (newDealData: any) => {
    window.location.reload()
  }

  const getRoleTitle = () => {
    if (role === "uk") return "Управление франчайзи и сделками"
    if (role === "franchisee") return "Ваши активные клиенты"
    return `Клиенты ${user.franchiseeName}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка сделок...</div>
      </div>
    )
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
          <p className="text-base sm:text-lg font-bold text-primary">
            {Object.values(boardData)
              .flat()
              .reduce((sum, d) => sum + Number.parseInt(d.amount.replace(/[^\d]/g, "") || "0"), 0)
              .toLocaleString()}{" "}
            ₽
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Конверсия</p>
          <p className="text-xl sm:text-2xl font-bold text-green-500">
            {Object.values(boardData).flat().length > 0
              ? Math.round(
                  ((boardData[stages[stages.length - 1]]?.length || 0) / Object.values(boardData).flat().length) * 100,
                )
              : 0}
            %
          </p>
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
