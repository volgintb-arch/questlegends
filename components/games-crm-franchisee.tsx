"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Settings, FileText, RefreshCw, Search, Filter, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { GameKanbanBoard } from "@/components/game-kanban-board"
import { GameCardFranchisee } from "@/components/game-card-franchisee"
import { GameCreateModal } from "@/components/game-create-modal"
import { GamePipelineSettings } from "@/components/game-pipeline-settings"
import { GameLogsModal } from "@/components/game-logs-modal"

interface Pipeline {
  id: string
  name: string
  description?: string
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

interface Lead {
  id: string
  clientName: string
  clientPhone?: string
  clientEmail?: string
  gameDate?: string
  gameTime?: string
  playersCount: number
  pricePerPerson: number
  packagePrice: number
  totalAmount: number
  prepayment: number
  responsibleId?: string
  responsibleName?: string
  notes?: string
  source?: string
  stageId: string
  pipelineId: string
  status?: string
  createdAt: string
  animatorsCount?: number
  animatorRate?: number
  hostsCount?: number
  hostRate?: number
  djsCount?: number
  djRate?: number
}

export function GamesCRMFranchisee() {
  const { user, getAuthHeaders, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const dealIdFromUrl = searchParams.get("dealId") || searchParams.get("leadId")
  const taskIdFromUrl = searchParams.get("taskId")

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("")
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isCardOpen, setIsCardOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isLogsOpen, setIsLogsOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    stageId: "",
    source: "",
    responsibleId: "",
    budgetFrom: "",
    budgetTo: "",
  })
  const [sortBy, setSortBy] = useState<"date" | "amount" | "name">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    if (user?.franchiseeId) {
      const storageKey = `crm_last_pipeline_${user.franchiseeId}`
      const savedPipelineId = localStorage.getItem(storageKey)
      if (savedPipelineId) {
        setSelectedPipelineId(savedPipelineId)
      }
    }
  }, [user?.franchiseeId])

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId)
    if (user?.franchiseeId) {
      const storageKey = `crm_last_pipeline_${user.franchiseeId}`
      localStorage.setItem(storageKey, pipelineId)
    }
  }

  const loadData = useCallback(async () => {
    if (!user?.franchiseeId) return

    const headers = getAuthHeaders()

    try {
      const pipelinesRes = await fetch(`/api/game-pipelines?franchiseeId=${user.franchiseeId}`, { headers })
      if (!pipelinesRes.ok) {
        console.error("[v0] CRM: Failed to fetch pipelines")
        return
      }

      const pipelinesData = await pipelinesRes.json()
      const pipelinesList = pipelinesData.data || pipelinesData.pipelines || []
      pipelinesList.sort(
        (a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      )
      setPipelines(pipelinesList)

      const storageKey = `crm_last_pipeline_${user.franchiseeId}`
      const savedPipelineId = localStorage.getItem(storageKey)

      let currentPipelineId = selectedPipelineId

      if (!currentPipelineId && pipelinesList.length > 0) {
        if (savedPipelineId && pipelinesList.some((p: Pipeline) => p.id === savedPipelineId)) {
          currentPipelineId = savedPipelineId
        } else {
          currentPipelineId = pipelinesList[0].id
        }
        setSelectedPipelineId(currentPipelineId)
        localStorage.setItem(storageKey, currentPipelineId)
      }

      const leadsUrl = currentPipelineId
        ? `/api/game-leads?pipelineId=${currentPipelineId}`
        : `/api/game-leads?franchiseeId=${user.franchiseeId}`

      const leadsRes = await fetch(leadsUrl, { headers })
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json()
        setLeads(leadsData.data || [])
      } else {
        console.error("[v0] CRM: Failed to fetch leads, status:", leadsRes.status)
        setLeads([])
      }
    } catch (error) {
      console.error("[v0] CRM: Error loading data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.franchiseeId, selectedPipelineId, getAuthHeaders])

  useEffect(() => {
    if (authLoading) return
    if (!user?.franchiseeId) {
      setLoading(false)
      return
    }
    loadData()
  }, [authLoading, user?.franchiseeId, loadData])

  useEffect(() => {
    if (!user?.franchiseeId || !selectedPipelineId || authLoading) return

    const fetchLeads = async () => {
      const headers = getAuthHeaders()
      try {
        const res = await fetch(`/api/game-leads?pipelineId=${selectedPipelineId}`, { headers })
        if (res.ok) {
          const data = await res.json()
          setLeads(data.data || [])
        }
      } catch (error) {
        console.error("[v0] CRM: Error fetching leads:", error)
      }
    }
    fetchLeads()
  }, [selectedPipelineId, user?.franchiseeId, authLoading, getAuthHeaders])

  useEffect(() => {
    if (dealIdFromUrl && leads.length > 0) {
      const lead = leads.find((l) => l.id === dealIdFromUrl)
      if (lead) {
        setSelectedLead(lead)
        setIsCardOpen(true)
        if (taskIdFromUrl) {
          setOpenTaskId(taskIdFromUrl)
        }
      }
    }
  }, [dealIdFromUrl, taskIdFromUrl, leads])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
  }

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead)
    setIsCardOpen(true)
    setOpenTaskId(null) // Reset task tab when manually clicking
  }

  const handleLeadUpdate = async () => {
    await loadData()
    if (selectedLead) {
      const updated = leads.find((l) => l.id === selectedLead.id)
      if (updated) {
        setSelectedLead(updated)
      }
    }
  }

  const handleLeadMove = async (leadId: string, newStageId: string) => {
    const headers = getAuthHeaders()

    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, stageId: newStageId } : lead)))

    try {
      const response = await fetch(`/api/game-leads/${leadId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: newStageId }),
      })

      if (response.ok) {
        await loadData()
      } else {
        await loadData()
        console.error("[v0] CRM: Error moving lead")
      }
    } catch (error) {
      console.error("[v0] CRM: Error moving lead:", error)
      await loadData()
    }
  }

  const handleCreateLead = async () => {
    setIsCreateModalOpen(false)
    await loadData()
  }

  const handleCloseCard = () => {
    setIsCardOpen(false)
    setSelectedLead(null)
    setOpenTaskId(null)
    router.replace("/crm")
    loadData()
  }

  const getFilteredAndSortedLeads = () => {
    let filtered = [...leads]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (lead) =>
          lead.clientName?.toLowerCase().includes(term) ||
          lead.clientPhone?.includes(term) ||
          lead.clientEmail?.toLowerCase().includes(term) ||
          lead.notes?.toLowerCase().includes(term),
      )
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((lead) => {
        if (!lead.gameDate) return false
        return new Date(lead.gameDate) >= new Date(filters.dateFrom)
      })
    }
    if (filters.dateTo) {
      filtered = filtered.filter((lead) => {
        if (!lead.gameDate) return false
        return new Date(lead.gameDate) <= new Date(filters.dateTo)
      })
    }

    if (filters.stageId) {
      filtered = filtered.filter((lead) => lead.stageId === filters.stageId)
    }

    if (filters.source) {
      filtered = filtered.filter((lead) => lead.source === filters.source)
    }

    if (filters.responsibleId) {
      filtered = filtered.filter((lead) => lead.responsibleId === filters.responsibleId)
    }

    if (filters.budgetFrom) {
      filtered = filtered.filter((lead) => lead.totalAmount >= Number.parseFloat(filters.budgetFrom))
    }
    if (filters.budgetTo) {
      filtered = filtered.filter((lead) => lead.totalAmount <= Number.parseFloat(filters.budgetTo))
    }

    filtered.sort((a, b) => {
      let comparison = 0
      if (sortBy === "date") {
        comparison = new Date(a.gameDate || a.createdAt).getTime() - new Date(b.gameDate || b.createdAt).getTime()
      } else if (sortBy === "amount") {
        comparison = a.totalAmount - b.totalAmount
      } else if (sortBy === "name") {
        comparison = a.clientName.localeCompare(b.clientName)
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }

  const filteredLeads = getFilteredAndSortedLeads()

  const handleClearFilters = () => {
    setSearchTerm("")
    setFilters({
      dateFrom: "",
      dateTo: "",
      stageId: "",
      source: "",
      responsibleId: "",
      budgetFrom: "",
      budgetTo: "",
    })
  }

  const currentPipeline = pipelines.find((p) => p.id === selectedPipelineId)
  const stages = currentPipeline?.stages || []

  const boardData: Record<string, Lead[]> = {}
  stages.forEach((stage) => {
    boardData[stage.id] = filteredLeads.filter((lead) => lead.stageId === stage.id)
  })

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!user?.franchiseeId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Франчайзи не найден</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">CRM Игры</h1>
          <Select value={selectedPipelineId} onValueChange={handlePipelineChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Выберите воронку" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsLogsOpen(true)}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Новая заявка</span>
            <span className="sm:hidden">Новая</span>
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, телефону, email или заметкам..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Фильтры
            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </Button>
          {(searchTerm || Object.values(filters).some((v) => v)) && (
            <Button variant="ghost" size="icon" onClick={handleClearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium">Дата от</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Дата до</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Стадия</label>
              <Select value={filters.stageId} onValueChange={(value) => setFilters({ ...filters, stageId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Все стадии" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все стадии</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Источник</label>
              <Input
                placeholder="Все источники"
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Бюджет от</label>
              <Input
                type="number"
                placeholder="0"
                value={filters.budgetFrom}
                onChange={(e) => setFilters({ ...filters, budgetFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Бюджет до</label>
              <Input
                type="number"
                placeholder="Без ограничений"
                value={filters.budgetTo}
                onChange={(e) => setFilters({ ...filters, budgetTo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Сортировка</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">По дате</SelectItem>
                  <SelectItem value="amount">По сумме</SelectItem>
                  <SelectItem value="name">По имени</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Порядок</label>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">По возрастанию</SelectItem>
                  <SelectItem value="desc">По убыванию</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Найдено заявок: {filteredLeads.length} из {leads.length}
          </span>
        </div>
      </div>

      {pipelines.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">У вас пока нет воронок</p>
          <Button onClick={() => setIsSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Создать воронку
          </Button>
        </div>
      ) : (
        <GameKanbanBoard
          stages={stages}
          boardData={boardData}
          onLeadClick={handleLeadClick}
          onLeadMove={handleLeadMove}
        />
      )}

      {selectedLead && (
        <GameCardFranchisee
          game={selectedLead as any}
          isOpen={isCardOpen}
          stages={stages}
          pipelines={pipelines}
          onUpdate={handleLeadUpdate}
          onClose={handleCloseCard}
          openTaskId={openTaskId}
        />
      )}

      <GameCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateLead}
        pipelineId={selectedPipelineId}
        stages={stages}
        franchiseeId={user.franchiseeId}
      />

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Настройки воронок</DialogTitle>
          </DialogHeader>
          <GamePipelineSettings franchiseeId={user.franchiseeId} onUpdate={loadData} />
        </DialogContent>
      </Dialog>

      <GameLogsModal isOpen={isLogsOpen} onClose={() => setIsLogsOpen(false)} />
    </div>
  )
}
