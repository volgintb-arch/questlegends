"use client"

import { useState, useEffect } from "react"
import { Plus, Settings } from "lucide-react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { KanbanColumn } from "./kanban-column"
import { DealCardAmoCRM } from "./deal-card-amocrm"
import { DealCreateModal } from "./deal-create-modal"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

interface DealsKanbanProps {
  role: "uk" | "franchisee" | "admin" | "super_admin"
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
  clientEmail?: string
  stage?: string
  stageId?: string
}

interface Pipeline {
  id: string
  name: string
  color: string
  isDefault: boolean
  stages: Stage[]
}

interface Stage {
  id: string
  name: string
  color: string
  order: number
}

type BoardData = Record<string, Deal[]>

export function DealsKanban({ role }: DealsKanbanProps) {
  const { user, getAuthHeaders } = useAuth()
  const [loading, setLoading] = useState(true)
  const [viewingDeal, setViewingDeal] = useState<any | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [boardData, setBoardData] = useState<BoardData>({})

  useEffect(() => {
    const fetchPipelines = async () => {
      try {
        const res = await fetch("/api/pipelines", { headers: getAuthHeaders() })
        const data = await res.json()
        if (data.data && data.data.length > 0) {
          setPipelines(data.data)
          const defaultPipeline = data.data.find((p: Pipeline) => p.isDefault) || data.data[0]
          setSelectedPipeline(defaultPipeline)
        }
      } catch (error) {
        console.error("[v0] Error fetching pipelines:", error)
      }
    }

    if (user) {
      fetchPipelines()
    }
  }, [user, getAuthHeaders])

  useEffect(() => {
    const fetchDeals = async () => {
      if (!selectedPipeline) return

      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.append("pipelineId", selectedPipeline.id)
        if (user?.franchiseeId && role !== "uk" && role !== "super_admin") {
          params.append("franchiseeId", user.franchiseeId)
        }

        const response = await fetch(`/api/deals?${params.toString()}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error("Failed to fetch deals")
        }

        const responseData = await response.json()
        const deals = responseData.data || responseData

        // Group deals by stage
        const grouped: BoardData = {}
        selectedPipeline.stages.forEach((stage) => {
          grouped[stage.name] = []
        })

        deals.forEach((deal: any) => {
          const stageName =
            selectedPipeline.stages.find((s) => s.id === deal.stageId || s.name === deal.stage)?.name ||
            selectedPipeline.stages[0]?.name

          if (grouped[stageName]) {
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
              clientEmail: deal.clientEmail,
              stage: deal.stage,
              stageId: deal.stageId,
            })
          }
        })

        setBoardData(grouped)
      } catch (error) {
        console.error("[v0] Error fetching deals:", error)
        const emptyBoard: BoardData = {}
        selectedPipeline.stages.forEach((stage) => {
          emptyBoard[stage.name] = []
        })
        setBoardData(emptyBoard)
      } finally {
        setLoading(false)
      }
    }

    if (user && selectedPipeline) {
      fetchDeals()
    }
  }, [user, role, selectedPipeline, getAuthHeaders])

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination || !selectedPipeline) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceStage = source.droppableId
    const destStage = destination.droppableId
    const destStageObj = selectedPipeline.stages.find((s) => s.name === destStage)

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
        body: JSON.stringify({
          stage: destStage,
          stageId: destStageObj?.id,
        }),
      })
    } catch (error) {
      console.error("[v0] Error updating deal stage:", error)
    }
  }

  const handleViewDeal = async (deal: Deal) => {
    try {
      const response = await fetch(`/api/deals/${deal.id}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        const fullDeal = data.success ? data : data

        setViewingDeal({
          id: fullDeal.id,
          title: fullDeal.clientName || "Новая сделка",
          budget: fullDeal.price || 0,
          stage: fullDeal.stage || selectedPipeline?.stages[0]?.name,
          stageId: fullDeal.stageId,
          pipelineId: fullDeal.pipelineId || selectedPipeline?.id,
          responsible: {
            id: fullDeal.responsibleId || user?.id || "",
            name: fullDeal.responsibleManager || user?.name || "Менеджер",
            avatar: undefined,
          },
          closeDate: fullDeal.closeDate ? new Date(fullDeal.closeDate) : undefined,
          contact: fullDeal.clientName
            ? {
                id: `contact-${fullDeal.id}`,
                name: fullDeal.clientName,
                phone: fullDeal.clientPhone || "",
                email: fullDeal.clientEmail || "",
                position: fullDeal.clientPosition || "",
              }
            : undefined,
          customFields: [
            {
              id: "source",
              name: "Источник",
              type: "select",
              value: fullDeal.source || "",
              options: ["Сайт", "Telegram", "Звонок", "Рекомендация", "Реклама"],
            },
            { id: "discount", name: "Скидка %", type: "number", value: fullDeal.discount || 0 },
            {
              id: "priority",
              name: "Приоритет",
              type: "select",
              value: fullDeal.priority || "normal",
              options: ["low", "normal", "high"],
            },
          ],
          stats: {
            totalDeals: 1,
            totalAmount: fullDeal.price || 0,
            ltv: fullDeal.price || 0,
          },
          feed: [],
          createdAt: new Date(fullDeal.createdAt || Date.now()),
          pipelineStages: selectedPipeline?.stages || [],
        })
        setIsViewModalOpen(true)
      }
    } catch (error) {
      console.error("[v0] Error loading deal details:", error)
    }
  }

  const handleCreateDeal = async (newDealData: any) => {
    if (!selectedPipeline) return

    try {
      const params = new URLSearchParams()
      if (user?.franchiseeId && role !== "uk" && role !== "super_admin") {
        params.append("franchiseeId", user.franchiseeId)
      }

      // Add pipeline info to new deal
      const dealWithPipeline = {
        ...newDealData,
        pipelineId: selectedPipeline.id,
        stageId: selectedPipeline.stages[0]?.id,
        stage: selectedPipeline.stages[0]?.name,
      }

      const response = await fetch(`/api/deals?${params.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const responseData = await response.json()
        const deals = responseData.data || responseData

        const grouped: BoardData = {}
        selectedPipeline.stages.forEach((stage) => {
          grouped[stage.name] = []
        })

        deals.forEach((deal: any) => {
          const stageName =
            selectedPipeline.stages.find((s) => s.id === deal.stageId || s.name === deal.stage)?.name ||
            selectedPipeline.stages[0]?.name

          if (grouped[stageName]) {
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
              clientEmail: deal.clientEmail,
              stage: deal.stage,
              stageId: deal.stageId,
            })
          }
        })

        setBoardData(grouped)
      }
    } catch (error) {
      console.error("[v0] Error refreshing deals:", error)
    }
  }

  const getRoleTitle = () => {
    if (role === "uk" || role === "super_admin") return "Управление франчайзи и сделками"
    if (role === "franchisee") return "Ваши активные клиенты"
    return `Клиенты ${user?.franchiseeName || ""}`
  }

  if (loading && !selectedPipeline) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-xs">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold text-foreground">Сделки / CRM</h1>
          <p className="text-[10px] text-muted-foreground">{getRoleTitle()}</p>
        </div>

        <div className="flex gap-2">
          {pipelines.length > 1 && (
            <select
              value={selectedPipeline?.id || ""}
              onChange={(e) => {
                const pipeline = pipelines.find((p) => p.id === e.target.value)
                if (pipeline) setSelectedPipeline(pipeline)
              }}
              className="h-7 text-xs px-2 rounded border bg-background"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {(role === "uk" || role === "super_admin") && (
            <Link href="/crm/settings">
              <button className="flex items-center gap-1 px-2 py-1.5 bg-muted/50 hover:bg-muted text-foreground rounded transition-colors">
                <Settings className="w-3 h-3" />
                <span className="text-[10px]">Настройки</span>
              </button>
            </Link>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span className="text-[10px]">Новая сделка</span>
          </button>
        </div>
      </div>

      {selectedPipeline && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedPipeline.color }} />
          <span className="text-xs font-medium">{selectedPipeline.name}</span>
          <span className="text-[10px] text-muted-foreground">({selectedPipeline.stages?.length || 0} этапов)</span>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-2 min-w-max">
            {selectedPipeline?.stages?.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage.name}
                deals={boardData[stage.name] || []}
                dealCount={(boardData[stage.name] || []).length}
                onViewDeal={handleViewDeal}
                stageColor={stage.color}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-border">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Всего сделок</p>
          <p className="text-base font-bold text-foreground">{Object.values(boardData).flat().length}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Высокие приоритеты</p>
          <p className="text-base font-bold text-accent">
            {
              Object.values(boardData)
                .flat()
                .filter((d) => d.priority === "high").length
            }
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Сумма в работе</p>
          <p className="text-sm font-bold text-primary">
            {Object.values(boardData)
              .flat()
              .reduce((sum, d) => sum + Number.parseInt(d.amount.replace(/[^\d]/g, "") || "0"), 0)
              .toLocaleString()}{" "}
            ₽
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Конверсия</p>
          <p className="text-base font-bold text-green-500">
            {Object.values(boardData).flat().length > 0 && selectedPipeline?.stages?.length
              ? Math.round(
                  ((boardData[selectedPipeline.stages[selectedPipeline.stages.length - 1]?.name]?.length || 0) /
                    Object.values(boardData).flat().length) *
                    100,
                )
              : 0}
            %
          </p>
        </div>
      </div>

      {viewingDeal && (
        <DealCardAmoCRM
          deal={viewingDeal}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false)
            setViewingDeal(null)
          }}
          onUpdate={(updatedDeal) => {
            handleCreateDeal(updatedDeal)
          }}
        />
      )}

      <DealCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateDeal}
        role={role}
        pipelineId={selectedPipeline?.id}
        initialStage={selectedPipeline?.stages?.[0]?.name}
        initialStageId={selectedPipeline?.stages?.[0]?.id}
      />
    </div>
  )
}
