"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Settings, FileText, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

      const currentPipelineId = selectedPipelineId || (pipelinesList.length > 0 ? pipelinesList[0].id : "")
      if (!selectedPipelineId && pipelinesList.length > 0) {
        setSelectedPipelineId(pipelinesList[0].id)
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

  const currentPipeline = pipelines.find((p) => p.id === selectedPipelineId)
  const stages = currentPipeline?.stages || []

  const boardData: Record<string, Lead[]> = {}
  stages.forEach((stage) => {
    boardData[stage.id] = leads.filter((lead) => lead.stageId === stage.id)
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
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">CRM Игры</h1>
          <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
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

        <div className="flex items-center gap-2">
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
            Новая заявка
          </Button>
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
