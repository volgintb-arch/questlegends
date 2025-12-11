"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  X,
  Phone,
  User,
  MessageSquare,
  CheckSquare,
  Send,
  Clock,
  DollarSign,
  GripVertical,
  Edit3,
  ArrowRight,
  Paperclip,
  FileText,
  Download,
  Plus,
  MapPin,
  Link,
  Briefcase,
  Trash2,
  Users,
  CalendarIcon,
  CheckCircle2,
  Circle,
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
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

// Types
interface FeedEvent {
  id: string
  type: string
  content: string
  createdAt: string
  userName: string
  userId?: string
  metadata?: any
}

interface DealTask {
  id: string
  title: string
  description?: string
  assigneeId?: string
  assigneeName?: string
  deadline?: string
  completed: boolean
  createdAt: string
  type?: string
}

interface DealFile {
  id: string
  name: string
  url: string
  type?: string
  size?: number
  createdAt: string
}

interface DealData {
  id: string
  clientName: string
  clientPhone?: string
  clientTelegram?: string
  price?: number
  stage: string
  stageId?: string
  pipelineId?: string
  location?: string
  source?: string
  responsible?: string
  responsibleId?: string
  responsibleName?: string
  createdAt: string
  // New contact fields
  contactName?: string
  contactPhone?: string
  messengerLink?: string
  city?: string
  // New deal fields
  paushalnyyVznos?: number
  investmentAmount?: number
  leadSource?: string
  additionalComment?: string
}

interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
}

interface DealCardAmoCRMProps {
  deal: DealData
  isOpen: boolean
  onClose: () => void
  onUpdate: (deal: DealData) => void
  stages?: PipelineStage[]
}

interface Employee {
  id: string
  name: string
  role: string
  telegramId?: string
}

export function DealCardAmoCRM({ deal, isOpen, onClose, onUpdate, stages = [] }: DealCardAmoCRMProps) {
  const { user, getAuthHeaders } = useAuth()
  const [dealData, setDealData] = useState<DealData>(deal)
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [tasks, setTasks] = useState<DealTask[]>([])
  const [files, setFiles] = useState<DealFile[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [responsibleUsers, setResponsibleUsers] = useState<string[]>([])
  const [leftWidth, setLeftWidth] = useState(45)
  const [isDragging, setIsDragging] = useState(false)
  const [messageInput, setMessageInput] = useState("")
  const [activeTab, setActiveTab] = useState<"note" | "task" | "file">("note")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<DealTask | null>(null)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [showDeleteTaskDialog, setShowDeleteTaskDialog] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(undefined)
  const [deadlineTime, setDeadlineTime] = useState<string>("12:00")
  const [newTask, setNewTask] = useState({ title: "", description: "", assigneeId: "", deadline: "", type: "general" })
  const [isSaving, setIsSaving] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load data
  useEffect(() => {
    if (isOpen && deal.id) {
      setDealData(deal)
      loadDealDetails()
      loadEvents()
      loadTasks()
      loadFiles()
      loadEmployees()
      loadResponsibleUsers()
    }
  }, [isOpen, deal])

  const loadDealDetails = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        if (data.success !== false) {
          setDealData((prev) => ({ ...prev, ...data }))
        }
      }
    } catch (e) {
      console.error("[v0] Error loading deal details:", e)
    }
  }

  const loadEvents = async () => {
    console.log("[v0] loadEvents called for deal:", deal.id)
    try {
      const headers = getAuthHeaders()
      console.log("[v0] loadEvents headers:", Object.keys(headers))

      const res = await fetch(`/api/deals/${deal.id}/events`, { headers })
      console.log("[v0] loadEvents response status:", res.status)

      if (res.ok) {
        const data = await res.json()
        console.log("[v0] loadEvents data:", data)
        const allEvents = data.events || []
        console.log("[v0] loadEvents found events:", allEvents.length)
        setEvents(
          allEvents.sort(
            (a: FeedEvent, b: FeedEvent) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        )
      } else {
        const errorText = await res.text()
        console.error("[v0] loadEvents error response:", errorText)
      }
    } catch (e) {
      console.error("[v0] Error loading events:", e)
    }
  }

  const loadTasks = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/tasks`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (e) {
      console.error("[v0] Error loading tasks:", e)
    }
  }

  const loadFiles = async () => {
    try {
      const response = await fetch(`/api/deals/${deal.id}/files`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setFiles(data.data || [])
      }
    } catch (error) {
      console.error("[v0] Error loading files:", error)
    }
  }

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/users", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        const allUsers = data.data || data.users || []
        const filteredUsers = allUsers.filter((u: any) => ["super_admin", "uk", "uk_employee"].includes(u.role))
        setEmployees(filteredUsers)
      }
    } catch (e) {
      console.error("[v0] Error loading employees:", e)
    }
  }

  const loadResponsibleUsers = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/responsible`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setResponsibleUsers(data.responsibleIds || [])
      }
    } catch (e) {
      console.error("[v0] Error loading responsible users:", e)
    }
  }

  const toggleResponsibleUser = async (userId: string) => {
    const newResponsibleUsers = responsibleUsers.includes(userId)
      ? responsibleUsers.filter((id) => id !== userId)
      : [...responsibleUsers, userId]

    setResponsibleUsers(newResponsibleUsers)

    try {
      await fetch(`/api/deals/${deal.id}/responsible`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ responsibleIds: newResponsibleUsers }),
      })
    } catch (e) {
      console.error("[v0] Error updating responsible users:", e)
    }
  }

  // Save deal changes
  const saveDeal = useCallback(
    async (updates: Partial<DealData>) => {
      setIsSaving(true)
      try {
        const res = await fetch(`/api/deals/${deal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(updates),
        })
        if (res.ok) {
          const updated = { ...dealData, ...updates }
          setDealData(updated)
          onUpdate(updated)
        }
      } catch (e) {
        console.error("[v0] Error saving deal:", e)
      } finally {
        setIsSaving(false)
      }
    },
    [deal.id, dealData, getAuthHeaders, onUpdate],
  )

  const handleDeleteDeal = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        setShowDeleteDialog(false)
        onClose()
        onUpdate(dealData) // Pass the current dealData to potentially trigger a refresh in the parent
      }
    } catch (e) {
      console.error("[v0] Error deleting deal:", e)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/tasks/${taskId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (res.ok) {
        await loadTasks()
        await loadEvents()
        setShowDeleteTaskDialog(false)
        setTaskToDelete(null)
        setShowTaskDetails(false)
        setSelectedTask(null)
      }
    } catch (e) {
      console.error("Error deleting task:", e)
    }
  }

  const renderEditableField = (
    fieldKey: keyof DealData,
    label: string,
    icon: React.ReactNode,
    type: "text" | "number" | "tel" | "url" = "text",
  ) => {
    const value = dealData[fieldKey]
    const isEditing = editingField === fieldKey

    return (
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
        {isEditing ? (
          <Input
            type={type}
            className="h-7 text-xs"
            value={value || ""}
            onChange={(e) =>
              setDealData({ ...dealData, [fieldKey]: type === "number" ? Number(e.target.value) : e.target.value })
            }
            onBlur={() => {
              setEditingField(null)
              saveDeal({ [fieldKey]: dealData[fieldKey] })
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditingField(null)
                saveDeal({ [fieldKey]: dealData[fieldKey] })
              }
            }}
            autoFocus
          />
        ) : (
          <div
            className="flex items-center gap-2 p-1.5 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors text-xs"
            onClick={() => setEditingField(fieldKey)}
          >
            {icon}
            <span className={value ? "text-foreground" : "text-muted-foreground"}>
              {type === "number" && value ? `${Number(value).toLocaleString()} ₽` : value || "Не указано"}
            </span>
            <Edit3 size={10} className="ml-auto text-muted-foreground" />
          </div>
        )}
      </div>
    )
  }

  // Add note
  const handleAddNote = async () => {
    if (!messageInput.trim()) return

    try {
      const res = await fetch(`/api/deals/${deal.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ type: "note", content: messageInput }),
      })

      if (res.ok) {
        setMessageInput("")
        await loadEvents()
      }
    } catch (e) {
      console.error("Error adding note:", e)
    }
  }

  // Add task
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/deals/${deal.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(newTask),
      })

      if (res.ok) {
        setNewTask({ title: "", description: "", assigneeId: "", deadline: "", type: "general" })
        setShowTaskModal(false)
        await loadTasks()
        await loadEvents()
      }
    } catch (e) {
      console.error("Error creating task:", e)
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle task
  const handleTaskComplete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: "completed" }),
      })

      if (res.ok) {
        await loadTasks()
        await loadEvents()
      }
    } catch (e) {
      console.error("Error completing task:", e)
    }
  }

  // Upload file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage")
      }

      const uploadedFile = await uploadResponse.json()

      const saveResponse = await fetch(`/api/deals/${deal.id}/files`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: file.name,
          url: uploadedFile.url,
          type: file.type,
          size: file.size,
        }),
      })

      if (!saveResponse.ok) {
        throw new Error("Failed to save file reference")
      }

      await loadFiles()
      await loadEvents()

      if (e.target) {
        e.target.value = ""
      }
    } catch (error: any) {
      console.error("[v0] Error uploading file:", error.message)
      alert(`Ошибка загрузки файла: ${error.message}`)
    }
  }

  // Download file
  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error("Failed to download file")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading file:", error)
      alert("Ошибка при скачивании файла")
    }
  }

  // Delete file
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Удалить файл?")) return

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error("Failed to delete file")
      }

      // Reload files list
      const filesResponse = await fetch(`/api/deals/${deal.id}/files`, {
        headers: getAuthHeaders(),
      })
      if (filesResponse.ok) {
        const data = await filesResponse.json()
        setFiles(data.data || [])
      }

      // Reload events
      loadEvents()
    } catch (error) {
      console.error("Error deleting file:", error)
      alert("Ошибка при удалении файла")
    }
  }

  // Stage change
  const handleStageChange = async (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId)
    if (stage) {
      await saveDeal({ stageId, stage: stage.name })
    }
  }

  // Resizer
  const handleMouseDown = () => setIsDragging(true)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(Math.max(newWidth, 30), 70))
    }
    const handleMouseUp = () => setIsDragging(false)

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const canDelete = user?.role === "super_admin" || user?.role === "uk" || user?.role === "uk_employee"

  // The following handleDeleteTask function is a redeclaration and will be removed.
  // const handleDeleteTask = async (taskId: string) => {
  //   try {
  //     const res = await fetch(`/api/deals/${deal.id}/tasks/${taskId}`, {
  //       method: "DELETE",
  //       headers: getAuthHeaders(),
  //     })

  //     if (res.ok) {
  //       await loadTasks()
  //       await loadEvents()
  //       setShowDeleteTaskDialog(false)
  //       setTaskToDelete(null)
  //       setShowTaskDetails(false)
  //       setSelectedTask(null)
  //     }
  //   } catch (e) {
  //     console.error("Error deleting task:", e)
  //   }
  // }

  const handleOpenTaskDetails = (task: DealTask) => {
    setSelectedTask(task)
    setShowTaskDetails(true)
  }

  useEffect(() => {
    if (deadlineDate) {
      const dateStr = format(deadlineDate, "yyyy-MM-dd")
      setNewTask((prev) => ({ ...prev, deadline: `${dateStr}T${deadlineTime}` }))
    }
  }, [deadlineDate, deadlineTime])

  if (!isOpen) return null

  return (
    <>
      {/* Replace div with Sheet */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full max-w-6xl sm:max-w-6xl p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-3">
              {isEditingTitle ? (
                <Input
                  className="text-base font-semibold h-8"
                  value={dealData.contactName || dealData.clientName}
                  onChange={(e) =>
                    setDealData({ ...dealData, contactName: e.target.value, clientName: e.target.value })
                  }
                  onBlur={() => {
                    setIsEditingTitle(false)
                    saveDeal({ contactName: dealData.contactName, clientName: dealData.contactName })
                  }}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                  autoFocus
                />
              ) : (
                <h2
                  className="text-base font-semibold cursor-pointer hover:text-primary flex items-center gap-1"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {dealData.contactName || dealData.clientName || "Без названия"}
                  <Edit3 size={12} className="text-muted-foreground" />
                </h2>
              )}
              {isSaving && <span className="text-[10px] text-muted-foreground">Сохранение...</span>}
            </div>
            <div className="flex items-center gap-2">
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 size={18} />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X size={18} />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel */}
            <div className="overflow-y-auto p-4 space-y-4" style={{ width: `${leftWidth}%` }}>
              {/* Pipeline Stages */}
              {stages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Этап воронки</p>
                  <div className="flex flex-wrap gap-1">
                    {stages.map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => handleStageChange(stage.id)}
                        className={`px-2 py-1 rounded text-[10px] transition-colors ${
                          dealData.stageId === stage.id || dealData.stage === stage.name
                            ? "text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        style={{
                          backgroundColor:
                            dealData.stageId === stage.id || dealData.stage === stage.name ? stage.color : undefined,
                        }}
                      >
                        {stage.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                <h3 className="text-xs font-semibold flex items-center gap-1 text-primary">
                  <User size={12} />
                  Контактные данные
                </h3>
                <div className="space-y-2">
                  {renderEditableField("contactName", "ФИО", <User size={12} className="text-muted-foreground" />)}
                  {renderEditableField(
                    "contactPhone",
                    "Номер телефона",
                    <Phone size={12} className="text-muted-foreground" />,
                    "tel",
                  )}
                  {renderEditableField(
                    "messengerLink",
                    "Ссылка на мессенджер",
                    <Link size={12} className="text-muted-foreground" />,
                    "url",
                  )}
                  {renderEditableField("city", "Город", <MapPin size={12} className="text-muted-foreground" />)}
                </div>
              </div>

              <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                <h3 className="text-xs font-semibold flex items-center gap-1 text-primary">
                  <Briefcase size={12} />
                  Данные сделки
                </h3>
                <div className="space-y-2">
                  {renderEditableField(
                    "paushalnyyVznos",
                    "Паушальный взнос",
                    <DollarSign size={12} className="text-green-500" />,
                    "number",
                  )}
                  {renderEditableField(
                    "investmentAmount",
                    "Сумма инвестиций",
                    <DollarSign size={12} className="text-blue-500" />,
                    "number",
                  )}

                  {/* Lead Source */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground">Источник лида</label>
                    <Select
                      value={dealData.leadSource || dealData.source || ""}
                      onValueChange={(value) => saveDeal({ leadSource: value })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Выбрать источник" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Сайт">Сайт</SelectItem>
                        <SelectItem value="Звонок">Звонок</SelectItem>
                        <SelectItem value="Рекомендация">Рекомендация</SelectItem>
                        <SelectItem value="Реклама">Реклама</SelectItem>
                        <SelectItem value="Соцсети">Соцсети</SelectItem>
                        <SelectItem value="Выставка">Выставка</SelectItem>
                        <SelectItem value="Холодный звонок">Холодный звонок</SelectItem>
                        <SelectItem value="Партнер">Партнер</SelectItem>
                        <SelectItem value="Другое">Другое</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <Users size={10} />
                      Ответственные (сотрудники УК)
                    </label>
                    <div className="space-y-1 max-h-32 overflow-y-auto p-2 bg-muted/20 rounded">
                      {employees.map((emp) => (
                        <label
                          key={emp.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-1 rounded text-xs"
                        >
                          <Checkbox
                            checked={responsibleUsers.includes(emp.id)}
                            onCheckedChange={() => toggleResponsibleUser(emp.id)}
                            className="h-3 w-3"
                          />
                          <span>{emp.name}</span>
                        </label>
                      ))}
                    </div>
                    {responsibleUsers.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">Выбрано: {responsibleUsers.length}</p>
                    )}
                  </div>

                  {/* Additional Comment */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground">Дополнительный комментарий</label>
                    {editingField === "additionalComment" ? (
                      <Textarea
                        className="text-xs min-h-[60px]"
                        value={dealData.additionalComment || ""}
                        onChange={(e) => setDealData({ ...dealData, additionalComment: e.target.value })}
                        onBlur={() => {
                          setEditingField(null)
                          saveDeal({ additionalComment: dealData.additionalComment })
                        }}
                        autoFocus
                      />
                    ) : (
                      <div
                        className="p-1.5 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors text-xs min-h-[40px]"
                        onClick={() => setEditingField("additionalComment")}
                      >
                        <span className={dealData.additionalComment ? "text-foreground" : "text-muted-foreground"}>
                          {dealData.additionalComment || "Нажмите, чтобы добавить комментарий..."}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold flex items-center gap-1">
                    <CheckSquare size={12} />
                    Задачи ({tasks.length})
                  </h3>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowTaskModal(true)}>
                    <Plus size={12} className="mr-1" />
                    Добавить
                  </Button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs hover:bg-muted/50 cursor-pointer group"
                      onClick={() => handleOpenTaskDetails(task)}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) => {
                          // Prevent opening details when clicking checkbox
                          handleTaskComplete(task.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3 w-3 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={task.completed ? "line-through text-muted-foreground" : ""}>{task.title}</p>
                        {task.assigneeName && <p className="text-[10px] text-muted-foreground">{task.assigneeName}</p>}
                        {task.deadline && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />
                            {formatDate(task.deadline)}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setTaskToDelete(task.id)
                          setShowDeleteTaskDialog(true)
                        }}
                      >
                        <Trash2 size={12} className="text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Files */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold flex items-center gap-1">
                    <FileText size={12} />
                    Файлы ({files.length})
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus size={12} className="mr-1" />
                    Добавить
                  </Button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
                      <FileText size={12} className="text-muted-foreground" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <button
                        onClick={() => handleDownloadFile(file.id, file.name)}
                        className="hover:text-primary"
                        title="Скачать"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="hover:text-destructive"
                        title="Удалить"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resizer */}
            <div
              className="w-1 bg-border hover:bg-primary/50 cursor-col-resize flex items-center justify-center"
              onMouseDown={handleMouseDown}
            >
              <GripVertical size={12} className="text-muted-foreground" />
            </div>

            {/* Right Panel - Feed */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Нет событий</p>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="flex gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">{event.userName?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{event.userName}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(event.createdAt)}</span>
                        </div>
                        <div className="mt-1">
                          {event.type === "stage_change" ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <ArrowRight size={12} />
                              <span>Изменил этап: {event.content}</span>
                            </div>
                          ) : event.type === "task" ? (
                            <div className="flex items-center gap-1 text-xs text-blue-500">
                              <CheckSquare size={12} />
                              <span>{event.content}</span>
                            </div>
                          ) : event.type === "task_completed" ? (
                            <div className="flex items-center gap-1 text-xs text-green-500">
                              <CheckSquare size={12} />
                              <span>Выполнил задачу: {event.content}</span>
                            </div>
                          ) : event.type === "file" ? (
                            <div className="flex items-center gap-1 text-xs text-purple-500">
                              <FileText size={12} />
                              <span>Добавил файл: {event.content}</span>
                            </div>
                          ) : event.type === "note" ? (
                            <div className="flex items-center gap-1 text-xs">
                              <MessageSquare size={12} className="mr-1" />
                              <p className="bg-muted/50 p-2 rounded">{event.content}</p>
                            </div>
                          ) : (
                            <p className="text-xs bg-muted/50 p-2 rounded">{event.content}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input Panel */}
              <div className="border-t p-3">
                <div className="flex gap-2 mb-2">
                  <Button
                    size="sm"
                    variant={activeTab === "note" ? "default" : "ghost"}
                    className="h-7 text-xs"
                    onClick={() => setActiveTab("note")}
                  >
                    <MessageSquare size={12} className="mr-1" />
                    Заметка
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === "task" ? "default" : "ghost"}
                    className="h-7 text-xs"
                    onClick={() => {
                      setActiveTab("task")
                      setShowTaskModal(true)
                    }}
                  >
                    <CheckSquare size={12} className="mr-1" />
                    Задача
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === "file" ? "default" : "ghost"}
                    className="h-7 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip size={12} className="mr-1" />
                    Файл
                  </Button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Написать заметку..."
                    className="min-h-[60px] text-xs resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleAddNote()
                      }
                    }}
                  />
                  <Button size="icon" className="h-[60px] w-10" onClick={handleAddNote}>
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Task Modal - Replace datetime-local with Calendar */}
      <Dialog
        open={showTaskModal}
        onOpenChange={(open) => {
          setShowTaskModal(open)
          if (!open) {
            setDeadlineDate(undefined)
            setDeadlineTime("12:00")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Новая задача</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Тип задачи</Label>
              <Select
                value={newTask.type || "general"}
                onValueChange={(value) => setNewTask({ ...newTask, type: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Выберите тип задачи" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Общая задача</SelectItem>
                  <SelectItem value="call">Звонок</SelectItem>
                  <SelectItem value="meeting">Встреча</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="follow_up">Следующий шаг</SelectItem>
                  <SelectItem value="document">Подготовка документов</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Название</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="h-8 text-xs"
                placeholder="Что нужно сделать?"
              />
            </div>
            <div>
              <Label className="text-xs">Описание</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="text-xs min-h-[60px]"
                placeholder="Подробности задачи..."
              />
            </div>
            <div>
              <Label className="text-xs">Исполнитель (сотрудник УК)</Label>
              <Select
                value={newTask.assigneeId}
                onValueChange={(value) => setNewTask({ ...newTask, assigneeId: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Выбрать сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Срок выполнения</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 text-xs flex-1 justify-start text-left font-normal bg-transparent"
                    >
                      <CalendarIcon size={12} className="mr-2" />
                      {deadlineDate ? format(deadlineDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deadlineDate}
                      onSelect={setDeadlineDate}
                      locale={ru}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="h-8 text-xs w-24"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTaskModal(false)}>
                Отмена
              </Button>
              <Button size="sm" onClick={handleCreateTask}>
                Создать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {selectedTask?.completed ? (
                <CheckCircle2 size={16} className="text-green-500" />
              ) : (
                <Circle size={16} className="text-muted-foreground" />
              )}
              Детали задачи
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Тип</Label>
                <p className="text-sm font-medium">
                  {selectedTask.type === "call" && "Звонок"}
                  {selectedTask.type === "meeting" && "Встреча"}
                  {selectedTask.type === "email" && "Email"}
                  {selectedTask.type === "follow_up" && "Следующий шаг"}
                  {selectedTask.type === "document" && "Подготовка документов"}
                  {(!selectedTask.type || selectedTask.type === "general") && "Общая задача"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Название</Label>
                <p className="text-sm font-medium">{selectedTask.title}</p>
              </div>
              {selectedTask.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Описание</Label>
                  <p className="text-sm">{selectedTask.description}</p>
                </div>
              )}
              {selectedTask.assigneeName && (
                <div>
                  <Label className="text-xs text-muted-foreground">Исполнитель</Label>
                  <p className="text-sm">{selectedTask.assigneeName}</p>
                </div>
              )}
              {selectedTask.deadline && (
                <div>
                  <Label className="text-xs text-muted-foreground">Срок выполнения</Label>
                  <p className="text-sm flex items-center gap-1">
                    <CalendarIcon size={12} />
                    {formatDate(selectedTask.deadline)}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Статус</Label>
                <p className={`text-sm font-medium ${selectedTask.completed ? "text-green-600" : "text-orange-500"}`}>
                  {selectedTask.completed ? "Выполнена" : "В работе"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Дата создания</Label>
                <p className="text-sm">{formatDate(selectedTask.createdAt)}</p>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setTaskToDelete(selectedTask.id)
                    setShowDeleteTaskDialog(true)
                  }}
                >
                  <Trash2 size={12} className="mr-1" />
                  Удалить
                </Button>
                <div className="flex gap-2">
                  {!selectedTask.completed && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        handleTaskComplete(selectedTask.id)
                        setShowTaskDetails(false)
                        setSelectedTask(null)
                      }}
                    >
                      <CheckCircle2 size={12} className="mr-1" />
                      Выполнить
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setShowTaskDetails(false)}>
                    Закрыть
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteTaskDialog} onOpenChange={setShowDeleteTaskDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Задача будет удалена безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => taskToDelete && handleDeleteTask(taskToDelete)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сделку?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить сделку "{dealData.contactName || dealData.clientName}"? Это действие нельзя
              отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDeal} className="bg-red-500 hover:bg-red-600">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
