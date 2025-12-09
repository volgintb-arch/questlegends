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
  createdAt: string
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
  const [leftWidth, setLeftWidth] = useState(45)
  const [isDragging, setIsDragging] = useState(false)
  const [messageInput, setMessageInput] = useState("")
  const [activeTab, setActiveTab] = useState<"note" | "task" | "file">("note")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: "", description: "", assigneeId: "", deadline: "" })
  const [isSaving, setIsSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load data
  useEffect(() => {
    if (isOpen && deal.id) {
      setDealData(deal)
      loadEvents()
      loadTasks()
      loadFiles()
      loadEmployees()
    }
  }, [isOpen, deal]) // Updated to use deal instead of deal.id

  const loadEvents = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/events`, { headers: getAuthHeaders() })
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
      const res = await fetch(`/api/deals/${deal.id}/files`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || [])
      }
    } catch (e) {
      console.error("[v0] Error loading files:", e)
    }
  }

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/users", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        const allUsers = data.data || data.users || []
        console.log("[v0] Users API response:", allUsers.length, "users")
        const filteredUsers = allUsers.filter((u: any) =>
          ["super_admin", "uk", "uk_employee", "franchisee", "admin", "employee"].includes(u.role),
        )
        setEmployees(filteredUsers)
        console.log("[v0] Loaded employees:", filteredUsers.length)
      }
    } catch (e) {
      console.error("[v0] Error loading employees:", e)
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
          const data = await res.json()
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

  // Add note
  const handleAddNote = async () => {
    if (!messageInput.trim()) return
    try {
      console.log("[v0] Adding note:", messageInput)
      const res = await fetch(`/api/deals/${deal.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ type: "note", content: messageInput }),
      })
      console.log("[v0] Add note response status:", res.status)
      if (res.ok) {
        setMessageInput("")
        loadEvents()
      } else {
        const errorData = await res.json()
        console.error("[v0] Add note error:", errorData)
      }
    } catch (e) {
      console.error("[v0] Error adding note:", e)
    }
  }

  // Add task
  const handleAddTask = async () => {
    if (!newTask.title.trim()) return
    try {
      const res = await fetch(`/api/deals/${deal.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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

  // Toggle task
  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`/api/deals/${deal.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ completed }),
      })
      loadTasks()
      loadEvents()
    } catch (e) {
      console.error("[v0] Error toggling task:", e)
    }
  }

  // Upload file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`/api/deals/${deal.id}/files`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      })
      if (res.ok) {
        loadFiles()
        loadEvents()
      }
    } catch (e) {
      console.error("[v0] Error uploading file:", e)
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

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div ref={containerRef} className="bg-background rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-3">
              {isEditingTitle ? (
                <Input
                  className="text-base font-semibold h-8"
                  value={dealData.clientName}
                  onChange={(e) => setDealData({ ...dealData, clientName: e.target.value })}
                  onBlur={() => {
                    setIsEditingTitle(false)
                    saveDeal({ clientName: dealData.clientName })
                  }}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                  autoFocus
                />
              ) : (
                <h2
                  className="text-base font-semibold cursor-pointer hover:text-primary flex items-center gap-1"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {dealData.clientName}
                  <Edit3 size={12} className="text-muted-foreground" />
                </h2>
              )}
              {isSaving && <span className="text-[10px] text-muted-foreground">Сохранение...</span>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel */}
            <div className="overflow-y-auto p-4 space-y-4" style={{ width: `${leftWidth}%` }}>
              {/* Budget */}
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-green-500" />
                {isEditingBudget ? (
                  <Input
                    type="number"
                    className="h-7 w-32 text-sm"
                    value={dealData.price || ""}
                    onChange={(e) => setDealData({ ...dealData, price: Number(e.target.value) })}
                    onBlur={() => {
                      setIsEditingBudget(false)
                      saveDeal({ price: dealData.price })
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-sm font-medium cursor-pointer hover:text-primary"
                    onClick={() => setIsEditingBudget(true)}
                  >
                    {dealData.price ? `${dealData.price.toLocaleString()} ₽` : "Не указан"}
                  </span>
                )}
              </div>

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

              {/* Contact Info */}
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                <h3 className="text-xs font-semibold flex items-center gap-1">
                  <User size={12} />
                  Контакт
                </h3>
                <div className="space-y-1 text-xs">
                  {dealData.clientPhone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-muted-foreground" />
                      <a href={`tel:${dealData.clientPhone}`} className="hover:text-primary">
                        {dealData.clientPhone}
                      </a>
                    </div>
                  )}
                  {dealData.clientTelegram && (
                    <div className="flex items-center gap-2">
                      <MessageSquare size={12} className="text-muted-foreground" />
                      <span>{dealData.clientTelegram}</span>
                    </div>
                  )}
                  {dealData.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>Город: {dealData.location}</span>
                    </div>
                  )}
                  {dealData.source && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>Источник: {dealData.source}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Responsible */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Ответственный</p>
                <Select
                  value={dealData.responsibleId || ""}
                  onValueChange={(value) => {
                    const emp = employees.find((e) => e.id === value)
                    saveDeal({ responsibleId: value, responsible: emp?.name })
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Выбрать" />
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
                    <div key={task.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) => handleToggleTask(task.id, !!checked)}
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
                    </div>
                  ))}
                </div>
              </div>

              {/* Files */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold flex items-center gap-1">
                  <FileText size={12} />
                  Файлы ({files.length})
                </h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
                      <FileText size={12} className="text-muted-foreground" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <a href={file.url} download className="hover:text-primary">
                        <Download size={12} />
                      </a>
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
        </div>
      </div>

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Новая задача</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
              <Label className="text-xs">Исполнитель</Label>
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
              <Input
                type="datetime-local"
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTaskModal(false)}>
                Отмена
              </Button>
              <Button size="sm" onClick={handleAddTask}>
                Создать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
