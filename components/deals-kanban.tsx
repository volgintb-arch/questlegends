"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Settings, History, Search, SlidersHorizontal, X } from "lucide-react"
import dynamic from "next/dynamic"
import { DealCardAmoCRM } from "./deal-card-amocrm"
import { DealCreateModal } from "./deal-create-modal"
import { PipelineSettings } from "./pipeline-settings"
import { CrmLogsModal } from "./crm-logs-modal"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const KanbanBoard = dynamic(() => import("./kanban-board").then((mod) => mod.KanbanBoard), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Загрузка доски...</div>
  ),
})

interface DealsKanbanProps {
  role: "uk" | "uk_employee" | "franchisee" | "own_point" | "admin" | "super_admin"
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
  responsibleId?: string
  hasTasks?: boolean
  hasOverdueTasks?: boolean
  hasCompletedTasks?: boolean
  taskCount?: number
  completedTaskCount?: number
  overdueTaskCount?: number
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

  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStage, setFilterStage] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [filterDateFrom, setFilterDateFrom] = useState<string>("")
  const [filterDateTo, setFilterDateTo] = useState<string>("")
  const [filterBudgetFrom, setFilterBudgetFrom] = useState<string>("")
  const [filterBudgetTo, setFilterBudgetTo] = useState<string>("")
  const [filterResponsible, setFilterResponsible] = useState<string>("all")
  const [responsibleUsers, setResponsibleUsers] = useState<{ id: string; name: string }[]>([])
  const [sortBy, setSortBy] = useState<string>("date")
  const [filteredBoardData, setFilteredBoardData] = useState<BoardData>({})
  const [filterTask, setFilterTask] = useState<string>("all")

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
      if (!selectedPipeline) {
        console.log("[v0] DealsKanban: No pipeline selected, skipping fetch")
        return
      }

      try {
        setLoading(true)
        console.log("[v0] DealsKanban: Fetching deals for pipeline:", selectedPipeline.id, "role:", role)

        const params = new URLSearchParams()
        params.append("pipelineId", selectedPipeline.id)
        params.append("includeTasks", "true")
        if (
          user?.franchiseeId &&
          role !== "uk" &&
          role !== "uk_employee" &&
          role !== "super_admin" &&
          role !== "own_point"
        ) {
          params.append("franchiseeId", user.franchiseeId)
          console.log("[v0] DealsKanban: Adding franchiseeId filter:", user.franchiseeId)
        }

        const response = await fetch(`/api/deals?${params.toString()}`, {
          headers: getAuthHeaders(),
        })

        console.log("[v0] DealsKanban: Response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] DealsKanban: Error response:", errorText)
          throw new Error("Failed to fetch deals")
        }

        const responseData = await response.json()
        const deals = responseData.data || []
        console.log("[v0] DealsKanban: Loaded deals:", deals.length)

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
              responsibleId: deal.responsibleId,
              hasTasks: deal.taskCount > 0,
              hasOverdueTasks: deal.overdueTaskCount > 0,
              hasCompletedTasks: deal.completedTaskCount > 0,
              taskCount: deal.taskCount || 0,
              completedTaskCount: deal.completedTaskCount || 0,
              overdueTaskCount: deal.overdueTaskCount || 0,
            })
          }
        })

        setBoardData(grouped)

        fetchCrmStats(selectedPipeline.id)
      } catch (error) {
        console.error("[v0] DealsKanban: Error fetching deals:", error)
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
        responsibleId: deal.responsibleId,
        hasTasks: deal.taskCount > 0,
        hasOverdueTasks: deal.overdueTaskCount > 0,
        hasCompletedTasks: deal.completedTaskCount > 0,
        taskCount: deal.taskCount || 0,
        completedTaskCount: deal.completedTaskCount || 0,
        overdueTaskCount: deal.overdueTaskCount || 0,
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

  const canManageSettings =
    user?.role === "super_admin" || user?.role === "uk" || user?.role === "uk_employee" || user?.role === "own_point"

  const hasValidStages =
    selectedPipeline &&
    selectedPipeline.stages &&
    selectedPipeline.stages.length > 0 &&
    selectedPipeline.stages.every((s) => s.id)

  useEffect(() => {
    const loadResponsibleUsers = async () => {
      try {
        const res = await fetch("/api/users?role=uk,uk_employee", { headers: getAuthHeaders() })
        if (res.ok) {
          const data = await res.json()
          setResponsibleUsers(data.users || [])
        }
      } catch (e) {
        console.error("Error loading responsible users:", e)
      }
    }
    loadResponsibleUsers()
  }, [])

  useEffect(() => {
    if (!selectedPipeline || !boardData) {
      setFilteredBoardData({})
      return
    }

    let allDeals: (Deal & { originalStageId: string })[] = []
    Object.entries(boardData).forEach(([stageId, deals]) => {
      deals.forEach((deal) => {
        allDeals.push({ ...deal, originalStageId: stageId })
      })
    })

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      allDeals = allDeals.filter(
        (deal) =>
          deal.title?.toLowerCase().includes(query) ||
          deal.clientName?.toLowerCase().includes(query) ||
          deal.clientPhone?.toLowerCase().includes(query) ||
          deal.clientEmail?.toLowerCase().includes(query) ||
          deal.city?.toLowerCase().includes(query),
      )
    }

    // Apply stage filter
    if (filterStage && filterStage !== "all") {
      allDeals = allDeals.filter((deal) => deal.stageId === filterStage)
    }

    // Apply priority filter
    if (filterPriority && filterPriority !== "all") {
      allDeals = allDeals.filter((deal) => deal.priority === filterPriority)
    }

    if (filterResponsible && filterResponsible !== "all") {
      allDeals = allDeals.filter((deal) => deal.responsibleId === filterResponsible)
    }

    if (filterTask && filterTask !== "all") {
      if (filterTask === "with_tasks") {
        allDeals = allDeals.filter((deal) => deal.hasTasks)
      } else if (filterTask === "without_tasks") {
        allDeals = allDeals.filter((deal) => !deal.hasTasks)
      } else if (filterTask === "overdue") {
        allDeals = allDeals.filter((deal) => deal.hasOverdueTasks)
      } else if (filterTask === "completed") {
        allDeals = allDeals.filter((deal) => deal.hasCompletedTasks)
      }
    }

    // Apply date filters
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom).getTime()
      allDeals = allDeals.filter((deal) => {
        const dealDate = Date.now() - deal.daysOpen * 24 * 60 * 60 * 1000
        return dealDate >= fromDate
      })
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo).getTime()
      allDeals = allDeals.filter((deal) => {
        const dealDate = Date.now() - deal.daysOpen * 24 * 60 * 60 * 1000
        return dealDate <= toDate
      })
    }

    // Apply budget filters
    if (filterBudgetFrom) {
      const minBudget = Number(filterBudgetFrom)
      allDeals = allDeals.filter((deal) => {
        const amount = Number(deal.amount.replace(/[^\d]/g, ""))
        return amount >= minBudget
      })
    }
    if (filterBudgetTo) {
      const maxBudget = Number(filterBudgetTo)
      allDeals = allDeals.filter((deal) => {
        const amount = Number(deal.amount.replace(/[^\d]/g, ""))
        return amount <= maxBudget
      })
    }

    // Apply sorting
    allDeals.sort((a, b) => {
      if (sortBy === "date") return b.daysOpen - a.daysOpen
      if (sortBy === "amount") {
        const amountA = Number(a.amount.replace(/[^\d]/g, ""))
        const amountB = Number(b.amount.replace(/[^\d]/g, ""))
        return amountB - amountA
      }
      if (sortBy === "name") return (a.title || "").localeCompare(b.title || "")
      if (sortBy === "responsible") return (a.responsibleName || "").localeCompare(b.responsibleName || "")
      return 0
    })

    // Group back by stages
    const grouped: BoardData = {}
    selectedPipeline.stages.forEach((stage) => {
      grouped[stage.id] = []
    })
    allDeals.forEach((deal) => {
      if (grouped[deal.originalStageId]) {
        grouped[deal.originalStageId].push(deal)
      }
    })

    setFilteredBoardData(grouped)
  }, [
    boardData,
    searchQuery,
    filterStage,
    filterPriority,
    filterResponsible,
    filterTask,
    filterDateFrom,
    filterDateTo,
    filterBudgetFrom,
    filterBudgetTo,
    sortBy,
    selectedPipeline,
  ])

  const handleClearFilters = () => {
    setSearchQuery("")
    setFilterStage("all")
    setFilterPriority("all")
    setFilterResponsible("all")
    setFilterTask("all")
    setFilterDateFrom("")
    setFilterDateTo("")
    setFilterBudgetFrom("")
    setFilterBudgetTo("")
    setSortBy("date")
  }

  const totalFilteredDeals = Object.values(filteredBoardData).reduce((sum, deals) => sum + deals.length, 0)
  const totalDeals = Object.values(boardData).reduce((sum, deals) => sum + deals.length, 0)

  if (loading && pipelines.length === 0) {
    return <div className="p-4 text-xs text-muted-foreground">Загрузка...</div>
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
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
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs bg-transparent"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            Фильтры
          </Button>
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

      {showFilters && (
        <div className="border-b p-3 bg-muted/30 shrink-0">
          <div className="grid grid-cols-6 gap-2 mb-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>

            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Все стадии" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все стадии</SelectItem>
                {selectedPipeline?.stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterResponsible} onValueChange={setFilterResponsible}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Все исполнители" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все исполнители</SelectItem>
                {responsibleUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTask} onValueChange={setFilterTask}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="По задачам" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все задачи</SelectItem>
                <SelectItem value="with_tasks">С задачами</SelectItem>
                <SelectItem value="without_tasks">Без задач</SelectItem>
                <SelectItem value="overdue">Просроченные</SelectItem>
                <SelectItem value="completed">Выполненные</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">По дате создания</SelectItem>
                <SelectItem value="amount">По сумме</SelectItem>
                <SelectItem value="name">По названию</SelectItem>
                <SelectItem value="responsible">По исполнителю</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleClearFilters}>
                <X className="h-3 w-3 mr-1" />
                Очистить
              </Button>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Input
              type="date"
              placeholder="От"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-8 text-xs w-32"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              type="date"
              placeholder="До"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-8 text-xs w-32"
            />
            <span className="text-xs text-muted-foreground ml-4">Бюджет:</span>
            <Input
              type="number"
              placeholder="От"
              value={filterBudgetFrom}
              onChange={(e) => setFilterBudgetFrom(e.target.value)}
              className="h-8 text-xs w-24"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              type="number"
              placeholder="До"
              value={filterBudgetTo}
              onChange={(e) => setFilterBudgetTo(e.target.value)}
              className="h-8 text-xs w-24"
            />
            <span className="text-xs text-muted-foreground ml-4">
              Найдено: {totalFilteredDeals} из {totalDeals} сделок
            </span>
          </div>
        </div>
      )}

      {hasValidStages ? (
        <KanbanBoard
          stages={selectedPipeline!.stages}
          boardData={filteredBoardData}
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

      {showLogsModal && <CrmLogsModal isOpen={showLogsModal} onClose={() => setShowLogsModal(false)} />}
    </div>
  )
}
