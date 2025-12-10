"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Settings, TrendingUp, TrendingDown, CheckCircle, XCircle, History } from "lucide-react"
import dynamic from "next/dynamic"
import { DealCardAmoCRM } from "./deal-card-amocrm"
import { DealCreateModal } from "./deal-create-modal"
import { PipelineSettings } from "./pipeline-settings"
import { CrmLogsModal } from "./crm-logs-modal"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const KanbanBoard = dynamic(() => import("./kanban-board").then((mod) => mod.KanbanBoard), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Загрузка доски...</div>
  ),
})

interface DealsKanbanProps {
  role: "uk" | "uk_employee" | "franchisee" | "admin" | "super_admin"
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
  contactName?: string
  city?: string
  responsibleName?: string
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
  isFixed?: boolean
  stageType?: string
}

interface CrmStats {
  completed: {
    totalInvestments: number
    totalPaushalka: number
    count: number
  }
  cancelled: {
    lostPaushalka: number
    count: number
  }
}

type BoardData = Record<string, Deal[]>

export function DealsKanban({ role }: DealsKanbanProps) {
  const { user, getAuthHeaders } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [viewingDeal, setViewingDeal] = useState<any | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [boardData, setBoardData] = useState<BoardData>({})
  const [crmStats, setCrmStats] = useState<CrmStats | null>(null)

  const fetchCrmStats = async (pipelineId?: string) => {
    try {
      const params = new URLSearchParams()
      if (pipelineId) params.append("pipelineId", pipelineId)

      const res = await fetch(`/api/crm/stats?${params.toString()}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setCrmStats(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching CRM stats:", error)
    }
  }

  useEffect(() => {
    const fetchPipelines = async () => {
      try {
        console.log("[v0] Fetching pipelines...")
        const res = await fetch("/api/pipelines", { headers: getAuthHeaders() })
        const data = await res.json()
        console.log("[v0] Pipelines response:", data)
        if (data.data && data.data.length > 0) {
          setPipelines(data.data)
          const defaultPipeline = data.data.find((p: Pipeline) => p.isDefault) || data.data[0]
          setSelectedPipeline(defaultPipeline)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error("[v0] Error fetching pipelines:", error)
        setLoading(false)
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
        if (user?.franchiseeId && role !== "uk" && role !== "uk_employee" && role !== "super_admin") {
          params.append("franchiseeId", user.franchiseeId)
        }

        const response = await fetch(`/api/deals?${params.toString()}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error("Failed to fetch deals")
        }

        const responseData = await response.json()
        const deals = responseData.data || []

        const grouped: BoardData = {}
        selectedPipeline.stages.forEach((stage) => {
          grouped[stage.id] = []
        })

        deals.forEach((deal: any) => {
          const stageId = deal.stageId || selectedPipeline.stages[0]?.id
          if (grouped[stageId]) {
            grouped[stageId].push({
              id: deal.id,
              title: deal.contactName || deal.clientName || deal.title || "Без названия",
              location: deal.city || deal.location || "",
              amount: deal.budget ? `${Number(deal.budget).toLocaleString()} ₽` : "0 ₽",
              daysOpen: Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
              clientName: deal.clientName,
              clientPhone: deal.clientPhone,
              clientEmail: deal.clientEmail,
              stage: deal.stage,
              stageId: deal.stageId,
              contactName: deal.contactName,
              city: deal.city,
              responsibleName: deal.responsibleName,
            })
          }
        })

        setBoardData(grouped)

        fetchCrmStats(selectedPipeline.id)
      } catch (error) {
        console.error("[v0] Error fetching deals:", error)
      } finally {
        setLoading(false)
      }
    }

    if (selectedPipeline) {
      fetchDeals()
    }
  }, [selectedPipeline, user, role, getAuthHeaders])

  useEffect(() => {
    const dealIdFromUrl = searchParams.get("dealId")
    if (dealIdFromUrl && user && !isViewModalOpen) {
      handleViewDeal(dealIdFromUrl)
      router.replace("/crm", { scroll: false })
    }
  }, [searchParams, user])

  const handleDragEnd = async (
    sourceId: string,
    destId: string,
    dealId: string,
    sourceIndex: number,
    destIndex: number,
  ) => {
    if (!selectedPipeline) return

    const newBoardData = { ...boardData }
    const [movedDeal] = newBoardData[sourceId].splice(sourceIndex, 1)
    movedDeal.stageId = destId
    newBoardData[destId].splice(destIndex, 0, movedDeal)
    setBoardData(newBoardData)

    try {
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          stageId: destId,
          stage: selectedPipeline.stages.find((s) => s.id === destId)?.name,
        }),
      })

      fetchCrmStats(selectedPipeline.id)
    } catch (error) {
      console.error("[v0] Error updating deal stage:", error)
    }
  }

  const handleViewDeal = async (dealId: string) => {
    try {
      console.log("[v0] Opening deal card for dealId:", dealId)
      const response = await fetch(`/api/deals/${dealId}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Deal data loaded:", data)
        setViewingDeal(data.success ? data : data)
        setIsViewModalOpen(true)
      } else {
        console.log("[v0] Failed to fetch deal:", response.status)
      }
    } catch (error) {
      console.error("[v0] Error fetching deal:", error)
    }
  }

  const handleDealCreated = async (deal: any) => {
    console.log("[v0] Deal created, opening card:", deal)
    setIsCreateModalOpen(false)

    if (selectedPipeline && deal) {
      const stageId = deal.stageId || selectedPipeline.stages[0]?.id
      const newDeal = {
        id: deal.id,
        title: deal.contactName || deal.clientName || "Без названия",
        location: deal.city || "",
        amount: deal.budget ? `${Number(deal.budget).toLocaleString()} ₽` : "0 ₽",
        daysOpen: 0,
        clientName: deal.clientName,
        clientPhone: deal.clientPhone,
        stage: deal.stage,
        stageId: deal.stageId,
        contactName: deal.contactName,
        city: deal.city,
        responsibleName: deal.responsibleName,
      }

      setBoardData((prev) => ({
        ...prev,
        [stageId]: [...(prev[stageId] || []), newDeal],
      }))

      setViewingDeal(deal)
      setIsViewModalOpen(true)
    }
  }

  const handleDealUpdated = () => {
    window.location.reload()
  }

  const handlePipelineCreated = async (pipelineId: string) => {
    try {
      const res = await fetch("/api/pipelines", { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.data) {
        setPipelines(data.data)
        const newPipeline = data.data.find((p: Pipeline) => p.id === pipelineId)
        if (newPipeline) {
          setSelectedPipeline(newPipeline)
        }
      }
      setShowSettings(false)
    } catch (error) {
      console.error("[v0] Error refreshing pipelines:", error)
    }
  }

  const canManageSettings = user?.role === "super_admin" || user?.role === "uk" || user?.role === "uk_employee"

  const hasValidStages =
    selectedPipeline &&
    selectedPipeline.stages &&
    selectedPipeline.stages.length > 0 &&
    selectedPipeline.stages.every((s) => s.id)

  if (loading && pipelines.length === 0) {
    return <div className="p-4 text-xs text-muted-foreground">Загрузка...</div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold">CRM</h1>
          <div className="flex gap-1">
            {pipelines.map((pipeline) => (
              <button
                key={pipeline.id}
                onClick={() => setSelectedPipeline(pipeline)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  selectedPipeline?.id === pipeline.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {pipeline.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManageSettings && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-transparent"
              onClick={() => setShowLogsModal(true)}
            >
              <History className="h-3 w-3 mr-1" />
              Логи
            </Button>
          )}
          {canManageSettings && (
            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                  <Settings className="h-3 w-3 mr-1" />
                  Настройки
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-sm">Настройки CRM</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <PipelineSettings onPipelineCreated={handlePipelineCreated} />
                </div>
              </SheetContent>
            </Sheet>
          )}
          <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Новая сделка
          </Button>
        </div>
      </div>

      {hasValidStages ? (
        <KanbanBoard
          stages={selectedPipeline!.stages}
          boardData={boardData}
          onDragEnd={handleDragEnd}
          onViewDeal={handleViewDeal}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-xs">Нет доступных воронок</p>
            {canManageSettings && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-7 text-xs bg-transparent"
                onClick={() => setShowSettings(true)}
              >
                Создать воронку
              </Button>
            )}
          </div>
        </div>
      )}

      {crmStats && (
        <div className="border-t bg-muted/30 p-3 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              {/* Completed stats */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Завершено:</span>
                </div>
                <span className="text-xs text-muted-foreground">{crmStats.completed.count} сделок</span>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs">Инвестиции:</span>
                <span className="text-xs font-semibold text-green-600">
                  {crmStats.completed.totalInvestments.toLocaleString()} ₽
                </span>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs">Паушалка:</span>
                <span className="text-xs font-semibold text-green-600">
                  {crmStats.completed.totalPaushalka.toLocaleString()} ₽
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Cancelled stats */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Отказы:</span>
                </div>
                <span className="text-xs text-muted-foreground">{crmStats.cancelled.count} сделок</span>
              </div>

              <div className="flex items-center gap-2">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span className="text-xs">Недополучено:</span>
                <span className="text-xs font-semibold text-red-500">
                  {crmStats.cancelled.lostPaushalka.toLocaleString()} ₽
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPipeline && (
        <DealCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleDealCreated}
          pipeline={selectedPipeline}
          role={role}
        />
      )}

      {viewingDeal && selectedPipeline && (
        <DealCardAmoCRM
          deal={viewingDeal}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false)
            setViewingDeal(null)
          }}
          onUpdate={handleDealUpdated}
          stages={selectedPipeline.stages || []}
        />
      )}

      <CrmLogsModal isOpen={showLogsModal} onClose={() => setShowLogsModal(false)} />
    </div>
  )
}
