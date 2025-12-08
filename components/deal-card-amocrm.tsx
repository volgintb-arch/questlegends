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
import { Badge } from "@/components/ui/badge"
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
  location?: string
  source?: string
  responsible?: string
  createdAt: string
}

interface DealCardAmoCRMProps {
  deal: DealData
  isOpen: boolean
  onClose: () => void
  onUpdate: (deal: DealData) => void
}

interface Employee {
  id: string
  name: string
  role: string
  telegramId?: string
}

export function DealCardAmoCRM({ deal, isOpen, onClose, onUpdate }: DealCardAmoCRMProps) {
  const { user, getAuthHeaders } = useAuth()
  const [dealData, setDealData] = useState<DealData>(deal)
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [tasks, setTasks] = useState<DealTask[]>([])
  const [files, setFiles] = useState<DealFile[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leftWidth, setLeftWidth] = useState(45)
  const [isDragging, setIsDragging] = useState(false)
  const [messageInput, setMessageInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: "", description: "", assigneeId: "", deadline: "" })
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const feedEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const stages = ["NEW", "Лиды", "Переговоры", "КП", "Договор", "Оплата", "Выполнено"]
  const stageLabels: Record<string, string> = {
    NEW: "Новые",
    Лиды: "Лиды",
    Переговоры: "Переговоры",
    КП: "КП",
    Договор: "Договор",
    Оплата: "Оплата",
    Выполнено: "Выполнено",
  }

  // Load data on mount
  useEffect(() => {
    if (isOpen && deal.id) {
      loadData()
    }
  }, [isOpen, deal.id])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const headers = getAuthHeaders()
      const [eventsRes, tasksRes, filesRes, employeesRes] = await Promise.all([
        fetch(`/api/deals/${deal.id}/events`, { headers }),
        fetch(`/api/deals/${deal.id}/tasks`, { headers }),
        fetch(`/api/deals/${deal.id}/files`, { headers }),
        fetch(`/api/users?role=uk`, { headers }),
      ])

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        setEvents(eventsData.data || [])
      }
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData.data || [])
      }
      if (filesRes.ok) {
        const filesData = await filesRes.json()
        setFiles(filesData.data || [])
      }
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json()
        setEmployees(employeesData.data || employeesData || [])
      }
    } catch (error) {
      console.error("[v0] Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-save with debounce
  const autoSave = useCallback(
    (field: string, value: any) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/deals/${dealData.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ [field]: value }),
          })
          if (response.ok) {
            addEvent("field_change", `Изменено поле "${field}"`)
          }
        } catch (error) {
          console.error("[v0] Auto-save error:", error)
        }
      }, 800)
    },
    [dealData.id, getAuthHeaders],
  )

  // Add event to feed
  const addEvent = async (type: string, content: string, metadata?: any) => {
    try {
      const response = await fetch(`/api/deals/${dealData.id}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ type, content, metadata }),
      })
      if (response.ok) {
        const data = await response.json()
        setEvents((prev) => [...prev, data.data])
      }
    } catch (error) {
      console.error("[v0] Error adding event:", error)
    }
  }

  // Handle stage change
  const handleStageChange = async (newStage: string) => {
    const oldStage = dealData.stage
    setDealData((prev) => ({ ...prev, stage: newStage }))

    try {
      const response = await fetch(`/api/deals/${dealData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ stage: newStage }),
      })

      if (response.ok) {
        addEvent("stage_change", `Сделка перемещена`, { from: oldStage, to: newStage })
      }
    } catch (error) {
      console.error("[v0] Stage change error:", error)
      setDealData((prev) => ({ ...prev, stage: oldStage }))
    }
  }

  // Handle message send
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return
    await addEvent("note", messageInput)
    setMessageInput("")
    setIsTyping(false)
  }

  // Handle task creation
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return

    try {
      const response = await fetch(`/api/deals/${dealData.id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(newTask),
      })

      if (response.ok) {
        const data = await response.json()
        setTasks((prev) => [data.data, ...prev])
        setNewTask({ title: "", description: "", assigneeId: "", deadline: "" })
        setShowTaskModal(false)
      }
    } catch (error) {
      console.error("[v0] Error creating task:", error)
    }
  }

  // Handle task completion
  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/deals/${dealData.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ completed }),
      })

      if (response.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed } : t)))
      }
    } catch (error) {
      console.error("[v0] Error updating task:", error)
    }
  }

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // For now, create a placeholder URL - in production you'd upload to blob storage
    const fakeUrl = URL.createObjectURL(file)

    try {
      const response = await fetch(`/api/deals/${dealData.id}/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: file.name,
          url: fakeUrl,
          type: file.type,
          size: file.size,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setFiles((prev) => [data.data, ...prev])
      }
    } catch (error) {
      console.error("[v0] Error uploading file:", error)
    }
  }

  // Resizer logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.max(30, Math.min(60, newWidth)))
    }

    const handleMouseUp = () => setIsDragging(false)

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  useEffect(() => {
    setIsTyping(!!messageInput)
  }, [messageInput])

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [events.length])

  if (!isOpen) return null

  const currentStageIndex = stages.indexOf(dealData.stage)

  const renderEvent = (event: FeedEvent) => {
    const getEventIcon = () => {
      switch (event.type) {
        case "note":
          return <MessageSquare className="w-3 h-3" />
        case "task":
        case "task_completed":
          return <CheckSquare className="w-3 h-3" />
        case "stage_change":
          return <ArrowRight className="w-3 h-3 text-purple-500" />
        case "field_change":
          return <Edit3 className="w-3 h-3 text-gray-500" />
        case "file":
          return <FileText className="w-3 h-3 text-blue-500" />
        default:
          return <MessageSquare className="w-3 h-3" />
      }
    }

    return (
      <div key={event.id} className="flex gap-2 group">
        <Avatar className="w-6 h-6 flex-shrink-0">
          <AvatarFallback className="text-[10px] bg-primary/20">{event.userName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-xs font-medium">{event.userName}</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(event.createdAt).toLocaleString("ru-RU", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="rounded border p-2 bg-muted/30 text-xs">
            <div className="flex items-start gap-1">
              {getEventIcon()}
              <span className="whitespace-pre-wrap">{event.content}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
        <div
          ref={containerRef}
          className="w-full max-w-5xl h-[85vh] bg-card rounded-lg shadow-2xl border overflow-hidden flex"
        >
          {/* Left Column - Deal Info */}
          <div className="flex-shrink-0 border-r overflow-hidden flex flex-col" style={{ width: `${leftWidth}%` }}>
            <div className="p-2 border-b flex items-center justify-between bg-muted/30">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
              <Badge variant="outline" className="text-[10px]">
                {dealData.id.slice(0, 8)}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-4">
                {/* Title */}
                <div>
                  {editingField === "clientName" ? (
                    <Input
                      value={editValue ?? dealData.clientName}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        setEditingField(null)
                        if (editValue !== dealData.clientName) {
                          setDealData((prev) => ({ ...prev, clientName: editValue }))
                          autoSave("clientName", editValue)
                        }
                      }}
                      autoFocus
                      className="text-base font-bold h-8"
                    />
                  ) : (
                    <h2
                      className="text-base font-bold cursor-pointer hover:text-primary"
                      onClick={() => {
                        setEditingField("clientName")
                        setEditValue(dealData.clientName)
                      }}
                    >
                      {dealData.clientName}
                    </h2>
                  )}
                </div>

                {/* Budget */}
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Бюджет</span>
                  </div>
                  {editingField === "price" ? (
                    <Input
                      type="number"
                      value={editValue ?? dealData.price}
                      onChange={(e) => setEditValue(Number(e.target.value))}
                      onBlur={() => {
                        setEditingField(null)
                        if (editValue !== dealData.price) {
                          setDealData((prev) => ({ ...prev, price: editValue }))
                          autoSave("price", editValue)
                        }
                      }}
                      autoFocus
                      className="w-24 h-7 text-right text-sm"
                    />
                  ) : (
                    <span
                      className="text-sm font-bold text-green-500 cursor-pointer"
                      onClick={() => {
                        setEditingField("price")
                        setEditValue(dealData.price)
                      }}
                    >
                      {(dealData.price || 0).toLocaleString()} ₽
                    </span>
                  )}
                </div>

                {/* Stage Pipeline */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Этап воронки</label>
                  <div className="flex gap-0.5 overflow-x-auto pb-1">
                    {stages.map((stage, index) => (
                      <button
                        key={stage}
                        onClick={() => handleStageChange(stage)}
                        className={`flex-1 min-w-[50px] py-1 px-1 text-[10px] rounded transition-all ${
                          index <= currentStageIndex
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {stageLabels[stage] || stage}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="border rounded p-2 space-y-2">
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <User className="w-3 h-3 text-primary" />
                    Контакт
                  </div>
                  <div className="space-y-1 text-xs">
                    {dealData.clientPhone && (
                      <a
                        href={`tel:${dealData.clientPhone}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {dealData.clientPhone}
                      </a>
                    )}
                    {dealData.clientTelegram && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">TG:</span>
                        {dealData.clientTelegram}
                      </div>
                    )}
                    {dealData.location && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Город:</span>
                        {dealData.location}
                      </div>
                    )}
                    {dealData.source && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Источник:</span>
                        {dealData.source}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tasks Section */}
                <div className="border rounded p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <CheckSquare className="w-3 h-3 text-amber-500" />
                      Задачи ({tasks.length})
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowTaskModal(true)}>
                      <Plus className="w-3 h-3 mr-1" />
                      Добавить
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {tasks.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">Нет задач</p>
                    ) : (
                      tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-1 p-1 rounded bg-muted/30">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={(checked) => handleTaskComplete(task.id, !!checked)}
                            className="mt-0.5 h-3 w-3"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[10px] ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </p>
                            {task.assigneeName && (
                              <p className="text-[9px] text-muted-foreground">{task.assigneeName}</p>
                            )}
                            {task.deadline && (
                              <p className="text-[9px] text-amber-500">
                                <Clock className="w-2 h-2 inline mr-0.5" />
                                {new Date(task.deadline).toLocaleDateString("ru-RU")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Files Section */}
                <div className="border rounded p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <Paperclip className="w-3 h-3 text-blue-500" />
                      Файлы ({files.length})
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Добавить
                    </Button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {files.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">Нет файлов</p>
                    ) : (
                      files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-1 rounded bg-muted/30">
                          <div className="flex items-center gap-1 min-w-0">
                            <FileText className="w-3 h-3 flex-shrink-0" />
                            <span className="text-[10px] truncate">{file.name}</span>
                          </div>
                          <a href={file.url} download className="text-primary">
                            <Download className="w-3 h-3" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resizer */}
          <div
            className="hidden md:flex w-1 bg-border hover:bg-primary/50 cursor-ew-resize items-center justify-center"
            onMouseDown={handleMouseDown}
          >
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>

          {/* Right Column - Feed */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b bg-muted/30">
              <h3 className="text-xs font-medium">История событий ({events.length})</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex flex-col gap-2">
                {isLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Загрузка...</p>
                ) : events.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Нет событий</p>
                ) : (
                  events.map(renderEvent)
                )}
                <div ref={feedEndRef} />
              </div>
            </div>

            {/* Typing Indicator */}
            {isTyping && (
              <div className="px-2 py-1 flex items-center gap-1">
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-[8px]">{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground animate-pulse">Печатает...</span>
              </div>
            )}

            {/* Input Panel - removed call recording button */}
            <div className="p-2 border-t bg-muted/30">
              <div className="flex items-end gap-1">
                <div className="flex-1">
                  <Textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Написать заметку..."
                    className="min-h-[60px] resize-none text-xs bg-background"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowTaskModal(true)}
                    title="Создать задачу"
                    className="h-7 w-7 p-0"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={handleSendMessage} disabled={!messageInput.trim()} className="h-7 w-7 p-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-3 h-3 mr-1" />
                  Файл
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Новая задача</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Название задачи *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Позвонить клиенту"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Описание</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Описание задачи..."
                className="min-h-[60px] text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Исполнитель</Label>
              <Select value={newTask.assigneeId} onValueChange={(v) => setNewTask({ ...newTask, assigneeId: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.name} {emp.telegramId && `(@${emp.telegramId})`}
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
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs bg-transparent"
                onClick={() => setShowTaskModal(false)}
              >
                Отмена
              </Button>
              <Button size="sm" className="flex-1 text-xs" onClick={handleCreateTask} disabled={!newTask.title.trim()}>
                Создать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
