"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  X,
  Phone,
  User,
  MessageSquare,
  CheckSquare,
  Send,
  Plus,
  Trash2,
  Users,
  Music,
  Mic,
  Mail,
  Network,
  Check,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface FeedEvent {
  id: string
  type: string
  content: string
  createdAt: string
  userName: string
}

interface GameTask {
  id: string
  title: string
  description?: string
  assigneeId?: string
  assigneeName?: string
  deadline?: string
  completed: boolean // Added completed status
  createdAt: string
}

interface StaffAssignment {
  id: string
  personnelId: string
  personnelName: string
  role: string
  rate: number
}

interface GameData {
  id: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  gameDate: string
  gameTime: string
  playersCount: number
  pricePerPerson: number
  totalAmount: number
  prepayment: number
  notes: string
  status: string
  stageId: string
  pipelineId: string
  responsibleId?: string
  responsibleName?: string
  source?: string
  animatorsCount: number
  animatorRate: number
  hostsCount: number
  hostRate: number
  djsCount: number
  djRate: number
}

interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
  stageType?: string
}

interface Pipeline {
  id: string
  name: string
  stages: PipelineStage[]
}

interface GameCardFranchiseeProps {
  game: GameData
  isOpen: boolean
  stages: PipelineStage[]
  pipelines: Pipeline[]
  onUpdate: () => void
  onClose: () => void
  openTaskId?: string | null
}

export function GameCardFranchisee({
  game,
  isOpen,
  stages,
  pipelines,
  onUpdate,
  onClose,
  openTaskId,
}: GameCardFranchiseeProps) {
  const { user, getAuthHeaders } = useAuth()

  const safeGame = game || ({} as GameData)

  const [gameData, setGameData] = useState<GameData>({
    id: safeGame.id || "",
    clientName: safeGame.clientName || "",
    clientPhone: safeGame.clientPhone || "",
    clientEmail: safeGame.clientEmail || "",
    gameDate: safeGame.gameDate || "",
    gameTime: safeGame.gameTime || "",
    playersCount: safeGame.playersCount ?? 1,
    pricePerPerson: safeGame.pricePerPerson ?? (safeGame as any).packagePrice ?? 0,
    totalAmount: safeGame.totalAmount ?? 0,
    prepayment: safeGame.prepayment ?? 0,
    notes: safeGame.notes || "",
    status: safeGame.status || "pending",
    stageId: safeGame.stageId || "",
    pipelineId: safeGame.pipelineId || "",
    responsibleId: safeGame.responsibleId,
    responsibleName: safeGame.responsibleName,
    source: safeGame.source || "",
    animatorsCount: safeGame.animatorsCount ?? 0,
    animatorRate: safeGame.animatorRate ?? 1500,
    hostsCount: safeGame.hostsCount ?? 0,
    hostRate: safeGame.hostRate ?? 2000,
    djsCount: safeGame.djsCount ?? 0, // Fixed: use safeGame
    djRate: safeGame.djRate ?? 2500, // Fixed: use safeGame
  })
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [tasks, setTasks] = useState<GameTask[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([])
  const [leftWidth, setLeftWidth] = useState(45)
  const [isDragging, setIsDragging] = useState(false)
  const [messageInput, setMessageInput] = useState("")
  const [activeTab, setActiveTab] = useState<"note" | "task">("note")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: "", description: "", assigneeId: "", deadline: "" })
  const [isSaving, setIsSaving] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [franchiseeUsers, setFranchiseeUsers] = useState<any[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  // Added state for selected task
  const [selectedTask, setSelectedTask] = useState<GameTask | null>(null)

  useEffect(() => {
    if (openTaskId) {
      setActiveTab("task")
    }
  }, [openTaskId])

  useEffect(() => {
    if (isOpen && game.id) {
      setGameData({
        id: game.id,
        clientName: game.clientName || "",
        clientPhone: game.clientPhone || "",
        clientEmail: game.clientEmail || "",
        gameDate: game.gameDate || "",
        gameTime: game.gameTime || "",
        playersCount: game.playersCount ?? 1,
        pricePerPerson: game.pricePerPerson ?? 0,
        totalAmount: game.totalAmount ?? 0,
        prepayment: game.prepayment ?? 0,
        notes: game.notes || "",
        status: game.status || "pending",
        stageId: game.stageId,
        pipelineId: game.pipelineId,
        responsibleId: game.responsibleId,
        responsibleName: game.responsibleName,
        source: game.source || "",
        animatorsCount: game.animatorsCount ?? 0,
        animatorRate: game.animatorRate ?? 1500,
        hostsCount: game.hostsCount ?? 0,
        hostRate: game.hostRate ?? 2000,
        djsCount: game.djsCount ?? 0,
        djRate: game.djRate ?? 2500,
      })
      // Renamed loadGameDetails to loadGameData to match the updates
      loadGameData()
      loadEvents()
      loadTasks()
      loadPersonnel()
      loadStaffAssignments()
      loadFranchiseeUsers()
    }
  }, [isOpen, game])

  useEffect(() => {
    if (game && game.id) {
      setGameData({
        id: game.id,
        clientName: game.clientName || "",
        clientPhone: game.clientPhone || "",
        clientEmail: game.clientEmail || "",
        gameDate: game.gameDate || "",
        gameTime: game.gameTime || "",
        playersCount: game.playersCount ?? 1,
        pricePerPerson: game.pricePerPerson ?? (game as any).packagePrice ?? 0,
        totalAmount: game.totalAmount ?? 0,
        prepayment: game.prepayment ?? 0,
        notes: game.notes || "",
        status: game.status || "pending",
        stageId: game.stageId || "",
        pipelineId: game.pipelineId || "",
        responsibleId: game.responsibleId,
        responsibleName: game.responsibleName,
        source: game.source || "",
        animatorsCount: game.animatorsCount ?? 0,
        animatorRate: game.animatorRate ?? 1500,
        hostsCount: game.hostsCount ?? 0,
        hostRate: game.hostRate ?? 2000,
        djsCount: game.djsCount ?? 0,
        djRate: game.djRate ?? 2500,
      })
    }
  }, [game])

  // Renamed from loadGameDetails to loadGameData
  const loadGameData = async () => {
    try {
      const res = await fetch(`/api/game-leads/${game.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setGameData({
            id: data.data.id,
            clientName: data.data.clientName || "",
            clientPhone: data.data.clientPhone || "",
            clientEmail: data.data.clientEmail || "",
            gameDate: data.data.gameDate || "",
            gameTime: data.data.gameTime || "",
            playersCount: data.data.playersCount ?? 1,
            pricePerPerson: data.data.pricePerPerson ?? 0,
            totalAmount: data.data.totalAmount ?? 0,
            prepayment: data.data.prepayment ?? 0,
            notes: data.data.notes || "",
            status: data.data.status || "pending",
            stageId: data.data.stageId,
            pipelineId: data.data.pipelineId,
            responsibleId: data.data.responsibleId,
            responsibleName: data.data.responsibleName,
            source: data.data.source || "",
            animatorsCount: data.data.animatorsCount ?? 0,
            animatorRate: data.data.animatorRate ?? 1500,
            hostsCount: data.data.hostsCount ?? 0,
            hostRate: data.data.hostRate ?? 2000,
            djsCount: data.data.djsCount ?? 0,
            djRate: data.data.djRate ?? 2500,
          })
        }
      }
    } catch (error) {
      console.error("[v0] Error loading game data:", error)
    }
  }

  const loadEvents = async () => {
    try {
      const res = await fetch(`/api/game-leads/${game.id}/events`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      }
    } catch (e) {
      console.error("[v0] Error loading events:", e)
    }
  }

  const loadTasks = async () => {
    try {
      const res = await fetch(`/api/game-leads/${game.id}/tasks`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setTasks(
          (data.data || []).map((t: any) => ({
            ...t,
            assigneeName: t.assignee?.name, // Added assigneeName
            completed: t.status === "completed", // Mapped status to completed boolean
          })),
        )
      }
    } catch (e) {
      console.error("[v0] Error loading tasks:", e)
    }
  }

  const loadPersonnel = async () => {
    try {
      const res = await fetch("/api/personnel", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setPersonnel(data.data || data || [])
      }
    } catch (e) {
      console.error("[v0] Error loading personnel:", e)
    }
  }

  const loadStaffAssignments = async () => {
    try {
      const res = await fetch(`/api/game-leads/${game.id}/staff`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStaffAssignments(data.data || [])
      }
    } catch (e) {
      console.error("[v0] Error loading staff assignments:", e)
    }
  }

  const loadFranchiseeUsers = async () => {
    try {
      const res = await fetch("/api/users?roles=franchisee,admin", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setFranchiseeUsers(data.data || data || [])
      }
    } catch (e) {
      console.error("[v0] Error loading users:", e)
    }
  }

  const handleSaveField = async (field: string, value: any) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/game-leads/${game.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ [field]: value }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setGameData((prev) => ({
            ...prev,
            [field]: value,
            // Update totalAmount if it was recalculated
            ...(data.data.totalAmount !== undefined && { totalAmount: data.data.totalAmount }),
          }))
        }
      }
    } catch (error) {
      console.error("[v0] Error saving field:", error)
    } finally {
      setIsSaving(false)
      setEditingField(null)
    }
  }

  const handleSendNote = async () => {
    if (!messageInput.trim()) return

    try {
      const res = await fetch(`/api/game-leads/${game.id}/events`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ type: "note", content: messageInput }),
      })
      if (res.ok) {
        setMessageInput("")
        loadEvents()
      }
    } catch (e) {
      console.error("[v0] Error sending note:", e)
    }
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return

    try {
      const res = await fetch(`/api/game-leads/${game.id}/tasks`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      })
      if (res.ok) {
        setNewTask({ title: "", description: "", assigneeId: "", deadline: "" })
        setShowTaskModal(false)
        loadTasks()
        loadEvents()
      }
    } catch (e) {
      console.error("[v0] Error adding task:", e)
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`/api/game-leads/${game.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      })
      loadTasks() // Reload tasks to update the UI
    } catch (e) {
      console.error("[v0] Error toggling task:", e)
    }
  }

  const handleAssignStaff = async (personnelId: string, role: string, rate: number) => {
    try {
      const res = await fetch(`/api/game-leads/${game.id}/staff`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ personnelId, role, rate }),
      })
      if (res.ok) {
        loadStaffAssignments()
        loadEvents()
      }
    } catch (e) {
      console.error("[v0] Error assigning staff:", e)
    }
  }

  const handleRemoveStaff = async (assignmentId: string) => {
    try {
      await fetch(`/api/game-leads/${game.id}/staff/${assignmentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      loadStaffAssignments()
      loadEvents()
    } catch (e) {
      console.error("[v0] Error removing staff:", e)
    }
  }

  const handleStageChange = async (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId)
    try {
      await fetch(`/api/game-leads/${game.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId,
          stageName: stage?.name,
          stageType: stage?.stageType,
        }),
      })
      setGameData((prev) => ({ ...prev, stageId, status: stage?.name || prev.status }))
      loadEvents()
    } catch (e) {
      console.error("[v0] Error changing stage:", e)
    }
  }

  const handleDelete = async () => {
    try {
      await fetch(`/api/game-leads/${game.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      onClose()
      onUpdate(gameData) // This might need to be adjusted based on how parent components handle deletion
    } catch (e) {
      console.error("[v0] Error deleting game:", e)
    }
  }

  const handleMouseDown = () => setIsDragging(true)
  const handleMouseUp = () => setIsDragging(false)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100
    setLeftWidth(Math.min(Math.max(newWidth, 30), 70))
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString("ru-RU")
  }

  const totalAmount = gameData.playersCount * gameData.pricePerPerson
  const remaining = totalAmount - gameData.prepayment
  const plannedStaffCost =
    (gameData.animatorsCount ?? 0) * (gameData.animatorRate ?? 0) +
    (gameData.hostsCount ?? 0) * (gameData.hostRate ?? 0) +
    (gameData.djsCount ?? 0) * (gameData.djRate ?? 0)
  const staffCost =
    staffAssignments.length > 0 ? staffAssignments.reduce((sum, s) => sum + Number(s.rate), 0) : plannedStaffCost
  const profit = totalAmount - staffCost

  if (!isOpen) return null

  const currentStage = stages.find((s) => s.id === gameData.stageId)
  const isScheduledStage = currentStage?.stageType === "scheduled"

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="bg-background border rounded-lg w-[95vw] max-w-6xl h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{gameData.clientName}</span>
            </div>
            <Select value={gameData.stageId || ""} onValueChange={handleStageChange}>
              <SelectTrigger className="h-7 w-auto text-xs">
                <SelectValue placeholder="Этап" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Удалить
            </Button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Details */}
          <div className="overflow-y-auto p-4 space-y-4" style={{ width: `${leftWidth}%` }}>
            {/* Client Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Клиент</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={gameData.clientName}
                    onChange={(e) => setGameData({ ...gameData, clientName: e.target.value })}
                    onBlur={(e) => handleSaveField("clientName", e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={gameData.clientPhone || ""}
                    onChange={(e) => setGameData({ ...gameData, clientPhone: e.target.value })}
                    onBlur={(e) => handleSaveField("clientPhone", e.target.value)}
                    placeholder="Телефон"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={gameData.clientEmail || ""}
                    onChange={(e) => setGameData({ ...gameData, clientEmail: e.target.value })}
                    onBlur={(e) => handleSaveField("clientEmail", e.target.value)}
                    placeholder="Email"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Game Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Данные игры</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Дата</label>
                  <Input
                    type="date"
                    value={gameData.gameDate?.split("T")[0] || ""}
                    onChange={(e) => setGameData({ ...gameData, gameDate: e.target.value })}
                    onBlur={(e) => handleSaveField("gameDate", e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Время</label>
                  <Input
                    type="time"
                    value={gameData.gameTime || ""}
                    onChange={(e) => setGameData({ ...gameData, gameTime: e.target.value })}
                    onBlur={(e) => handleSaveField("gameTime", e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Игроков</label>
                  <Input
                    type="number"
                    value={gameData.playersCount}
                    onChange={(e) => setGameData({ ...gameData, playersCount: Number(e.target.value) })}
                    onBlur={(e) => handleSaveField("playersCount", Number(e.target.value))}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Цена/чел</label>
                  <Input
                    type="number"
                    value={gameData.pricePerPerson}
                    onChange={(e) => setGameData({ ...gameData, pricePerPerson: Number(e.target.value) })}
                    onBlur={(e) => handleSaveField("pricePerPerson", Number(e.target.value))}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Financial Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Финансы</h3>
              <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>
                    Итого ({gameData.playersCount} × {(gameData.pricePerPerson ?? 0).toLocaleString()} ₽)
                  </span>
                  <span className="font-semibold text-green-600 text-base">{totalAmount.toLocaleString()} ₽</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Предоплата</span>
                  <Input
                    type="number"
                    value={gameData.prepayment}
                    onChange={(e) => setGameData({ ...gameData, prepayment: Number(e.target.value) })}
                    onBlur={(e) => handleSaveField("prepayment", Number(e.target.value))}
                    className="h-8 w-32 text-sm text-right"
                  />
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Остаток</span>
                  <span
                    className={remaining > 0 ? "text-orange-500 font-semibold text-base" : "text-green-600 text-base"}
                  >
                    {remaining.toLocaleString()} ₽
                  </span>
                </div>

                <div className="border-t pt-3 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Персонал (план)</h4>

                  {/* Animators */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Аниматоры:</span>
                      <Input
                        type="number"
                        min="0"
                        value={gameData.animatorsCount ?? 0}
                        onChange={(e) => setGameData({ ...gameData, animatorsCount: Number(e.target.value) })}
                        onBlur={(e) => handleSaveField("animatorsCount", Number(e.target.value))}
                        className="h-8 w-16 text-sm text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Ставка:</span>
                      <Input
                        type="number"
                        min="0"
                        value={gameData.animatorRate ?? 1500}
                        onChange={(e) => setGameData({ ...gameData, animatorRate: Number(e.target.value) })}
                        onBlur={(e) => handleSaveField("animatorRate", Number(e.target.value))}
                        className="h-8 w-24 text-sm text-right"
                      />
                      <span className="text-sm">₽</span>
                    </div>
                  </div>

                  {/* Hosts */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Ведущие:</span>
                      <Input
                        type="number"
                        min="0"
                        value={gameData.hostsCount ?? 0}
                        onChange={(e) => setGameData({ ...gameData, hostsCount: Number(e.target.value) })}
                        onBlur={(e) => handleSaveField("hostsCount", Number(e.target.value))}
                        className="h-8 w-16 text-sm text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Ставка:</span>
                      <Input
                        type="number"
                        min="0"
                        value={gameData.hostRate ?? 2000}
                        onChange={(e) => setGameData({ ...gameData, hostRate: Number(e.target.value) })}
                        onBlur={(e) => handleSaveField("hostRate", Number(e.target.value))}
                        className="h-8 w-24 text-sm text-right"
                      />
                      <span className="text-sm">₽</span>
                    </div>
                  </div>

                  {/* DJs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-pink-500" />
                      <span className="text-sm">DJ:</span>
                      <Input
                        type="number"
                        min="0"
                        value={gameData.djsCount ?? 0}
                        onChange={(e) => setGameData({ ...gameData, djsCount: Number(e.target.value) })}
                        onBlur={(e) => handleSaveField("djsCount", Number(e.target.value))}
                        className="h-8 w-16 text-sm text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Ставка:</span>
                      <Input
                        type="number"
                        min="0"
                        value={gameData.djRate ?? 2500}
                        onChange={(e) => setGameData({ ...gameData, djRate: Number(e.target.value) })}
                        onBlur={(e) => handleSaveField("djRate", Number(e.target.value))}
                        className="h-8 w-24 text-sm text-right"
                      />
                      <span className="text-sm">₽</span>
                    </div>
                  </div>
                </div>

                {/* Staff cost summary */}
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Расходы на персонал</span>
                  <span className="text-red-500">-{staffCost.toLocaleString()} ₽</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Прибыль</span>
                  <span className={profit >= 0 ? "text-green-600" : "text-red-500"}>{profit.toLocaleString()} ₽</span>
                </div>
              </div>
            </div>

            {/* Source */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Источник</h3>
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={gameData.source || ""}
                  onChange={(e) => setGameData({ ...gameData, source: e.target.value })}
                  onBlur={(e) => handleSaveField("source", e.target.value)}
                  placeholder="Источник лида"
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Staff Assignments - visible when stage is "scheduled" */}
            {isScheduledStage && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">Персонал на игру</h3>
                <div className="space-y-2">
                  {staffAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        {assignment.role === "animator" && <Users className="h-3 w-3 text-purple-500" />}
                        {assignment.role === "host" && <Mic className="h-3 w-3 text-blue-500" />}
                        {assignment.role === "dj" && <Music className="h-3 w-3 text-pink-500" />}
                        <span className="text-xs">{assignment.personnelName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({assignment.role === "animator" ? "Аниматор" : assignment.role === "host" ? "Ведущий" : "DJ"}
                          )
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{Number(assignment.rate).toLocaleString()} ₽</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-destructive"
                          onClick={() => handleRemoveStaff(assignment.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Select
                      onValueChange={(id) => {
                        const p = personnel.find((x) => x.id === id)
                        if (p) handleAssignStaff(id, "animator", 1500)
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="+ Аниматор" />
                      </SelectTrigger>
                      <SelectContent>
                        {personnel
                          .filter((p) => p.position?.toLowerCase().includes("аниматор"))
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <Select
                      onValueChange={(id) => {
                        const p = personnel.find((x) => x.id === id)
                        if (p) handleAssignStaff(id, "host", 2000)
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="+ Ведущий" />
                      </SelectTrigger>
                      <SelectContent>
                        {personnel
                          .filter((p) => p.position?.toLowerCase().includes("ведущ"))
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <Select
                      onValueChange={(id) => {
                        const p = personnel.find((x) => x.id === id)
                        if (p) handleAssignStaff(id, "dj", 2500)
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="+ DJ" />
                      </SelectTrigger>
                      <SelectContent>
                        {personnel
                          .filter(
                            (p) =>
                              p.position?.toLowerCase().includes("dj") || p.position?.toLowerCase().includes("диджей"),
                          )
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">Задачи</h3>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowTaskModal(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Добавить
                </Button>
              </div>
              <div className="space-y-1">
                {/* Update task display in the list to show strikethrough for completed tasks */}
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                      task.completed ? "bg-muted/30 border-muted" : "bg-background border-border"
                    }`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          task.completed
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-muted-foreground hover:border-primary"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation() // Prevent opening task modal when clicking checkbox
                          handleToggleTask(task.id, !task.completed)
                        }}
                      >
                        {task.completed && <Check className="w-3 h-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm ${
                            task.completed ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{task.description}</p>
                        )}
                        {task.deadline && (
                          <p className="text-xs text-muted-foreground mt-1">
                            До: {new Date(task.deadline).toLocaleDateString("ru-RU")}
                          </p>
                        )}
                        {task.assigneeName && (
                          <p className="text-xs text-muted-foreground">Исполнитель: {task.assigneeName}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Примечания</label>
              <Textarea
                value={gameData.notes || ""}
                onChange={(e) => setGameData({ ...gameData, notes: e.target.value })}
                onBlur={(e) => handleSaveField("notes", e.target.value)}
                placeholder="Дополнительная информация..."
                className="text-xs min-h-[60px]"
              />
            </div>
          </div>

          {/* Resizer */}
          <div onMouseDown={handleMouseDown} className="w-1 bg-border hover:bg-primary/50 cursor-col-resize shrink-0" />

          {/* Right Panel - Events Feed */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b p-2 flex gap-2">
              <button
                onClick={() => setActiveTab("note")}
                className={`px-3 py-1 text-xs rounded ${activeTab === "note" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <MessageSquare className="h-3 w-3 inline mr-1" />
                Заметка
              </button>
              <button
                onClick={() => setActiveTab("task")}
                className={`px-3 py-1 text-xs rounded ${activeTab === "task" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <CheckSquare className="h-3 w-3 inline mr-1" />
                Задача
              </button>
            </div>

            {activeTab === "note" ? (
              <>
                {/* Events List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {events.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-8">Нет событий</div>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className="flex gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="text-[10px]">{event.userName?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{event.userName}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(event.createdAt).toLocaleString("ru-RU")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{event.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Добавить заметку..."
                      className="flex-1 h-8 text-xs"
                      onKeyPress={(e) => e.key === "Enter" && handleSendNote()}
                    />
                    <Button size="sm" className="h-8" onClick={handleSendNote}>
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Task List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {tasks.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-8">Нет задач</div>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-2 p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedTask(task)}
                      >
                        <Checkbox
                          checked={task.completed}
                          className="mt-0.5"
                          onCheckedChange={(checked) => {
                            // Prevent opening task when clicking checkbox
                            // event?.stopPropagation() // This line was commented out in the original for some reason
                            handleToggleTask(task.id, !!checked)
                          }}
                          onClick={(e) => e.stopPropagation()} // Ensure checkbox click doesn't trigger task modal
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}
                            >
                              {task.title}
                            </span>
                            {task.assigneeName && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {task.assigneeName}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{task.description}</p>
                          )}
                          {task.deadline && (
                            <span className="text-[10px] text-muted-foreground">
                              Дедлайн: {formatDate(task.deadline)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Task Button */}
                <div className="border-t p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs bg-transparent"
                    onClick={() => setShowTaskModal(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Добавить задачу
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Новая задача</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Название</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Описание</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="text-xs min-h-[60px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Исполнитель</Label>
              <Select
                value={newTask.assigneeId}
                onValueChange={(value) => setNewTask({ ...newTask, assigneeId: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Выберите исполнителя" />
                </SelectTrigger>
                <SelectContent>
                  {franchiseeUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2">
                        <span>{u.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({u.role === "franchisee" ? "Франчайзи" : "Администратор"})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Дедлайн</Label>
              <Input
                type="date"
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <Button onClick={handleAddTask} className="w-full h-8 text-xs">
              Создать задачу
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              {selectedTask.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Описание</Label>
                  <p className="text-sm mt-1">{selectedTask.description}</p>
                </div>
              )}
              {selectedTask.assigneeName && (
                <div>
                  <Label className="text-xs text-muted-foreground">Исполнитель</Label>
                  <p className="text-sm mt-1">{selectedTask.assigneeName}</p>
                </div>
              )}
              {selectedTask.deadline && (
                <div>
                  <Label className="text-xs text-muted-foreground">Дедлайн</Label>
                  <p className="text-sm mt-1">{formatDate(selectedTask.deadline)}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Статус</Label>
                <p className="text-sm mt-1">{selectedTask.completed ? "Выполнено" : "В работе"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Создано</Label>
                <p className="text-sm mt-1">{new Date(selectedTask.createdAt).toLocaleString("ru-RU")}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedTask.completed ? "outline" : "default"}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    handleToggleTask(selectedTask.id, !selectedTask.completed)
                    // Update local state to reflect the change immediately in the modal
                    setSelectedTask({ ...selectedTask, completed: !selectedTask.completed })
                  }}
                >
                  {selectedTask.completed ? "Открыть заново" : "Завершить"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>
                  Закрыть
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Удалить заявку?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Это действие нельзя отменить. Все данные заявки будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-8 text-xs bg-destructive text-destructive-foreground"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
