"use client"

import { useState, useEffect } from "react"
import {
  X,
  Phone,
  Mail,
  Clock,
  DollarSign,
  User,
  MapPin,
  Package,
  Users,
  Calendar,
  Send,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Save,
  Plus,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Activity {
  id: string
  type: "event" | "comment" | "message" | "task"
  timestamp: Date
  user: string
  content: string
  status?: "pending" | "completed"
  assignedTo?: string
  assignedTelegramId?: string
}

interface Contact {
  name: string
  phone: string
  email: string
  telegramId?: string
  socialLinks?: string[]
}

interface DealData {
  id: string
  title: string
  stage: string
  amount: number
  source: string
  createdAt: string
  participants: number
  package: string
  location: string
  contact: Contact
  responsible: string
  activities: Activity[]
  tasks: Activity[]
  checkPerPerson: number
  animatorsCount: number
  animatorRate: number
  hostRate: number
  djRate: number
  franchiseeId?: string
}

interface UKEmployee {
  id: string
  name: string
  telegramId?: string
}

interface DealCardFullProps {
  deal: DealData
  isOpen: boolean
  onClose: () => void
  onUpdate: (deal: DealData) => void
  onDelete: () => void
  role: "uk" | "franchisee" | "admin" | "super_admin"
}

export function DealCardFull({ deal, isOpen, onClose, onUpdate, onDelete, role }: DealCardFullProps) {
  const { getAuthHeaders } = useAuth()
  const [dealData, setDealData] = useState<DealData>(deal)
  const [messageInput, setMessageInput] = useState("")
  const [isEditingField, setIsEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [managers, setManagers] = useState<UKEmployee[]>([])
  const [isMounted, setIsMounted] = useState(false)

  const [newTask, setNewTask] = useState({
    content: "",
    assignedTo: "",
    assignedTelegramId: "",
  })

  const stages = ["NEW", "Лиды", "Переговоры", "КП", "Договор", "Оплата", "Выполнено"]

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  const authHeaders = getAuthHeaders()

  // Fetch UK managers for assignment
  useEffect(() => {
    if (!isMounted) return
    if ((role === "uk" || role === "super_admin") && isOpen) {
      console.log("[v0] Fetching UK employees for managers list")
      fetch("/api/users?role=uk", {
        headers: authHeaders,
      })
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return
          console.log("[v0] UK employees response:", JSON.stringify(data).slice(0, 200))
          const users = data.data || data || []
          if (Array.isArray(users)) {
            setManagers(
              users.map((u: any) => ({
                id: u.id,
                name: u.name,
                telegramId: u.telegramId || u.telegram || u.phone,
              })),
            )
            console.log("[v0] Loaded managers:", users.length)
          }
        })
        .catch((err) => {
          console.error("[v0] Error loading UK employees:", err)
        })
    }
  }, [role, isOpen, isMounted]) // Removed getAuthHeaders from deps

  const dealId = deal.id
  useEffect(() => {
    if (!isMounted) return
    if (isOpen && dealId) {
      fetch(`/api/deals/${dealId}`, {
        headers: authHeaders,
      })
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return
          if (data && !data.error) {
            setDealData({
              ...deal,
              ...data,
              title: data.clientName || deal.title,
              amount: data.price || deal.amount,
              location: data.franchiseeCity || data.notes?.match(/Город: ([^\n]+)/)?.[1] || deal.location,
              contact: {
                name: data.clientName || deal.contact?.name || "",
                phone: data.clientPhone || deal.contact?.phone || "",
                email: deal.contact?.email || "",
                telegramId: data.clientTelegram || deal.contact?.telegramId || "",
              },
              responsible: data.responsibleName || data.responsible || deal.responsible,
              activities: deal.activities || [],
              tasks: deal.tasks || [],
            })
          }
        })
        .catch((err) => console.error("[v0] Error fetching deal details:", err))
    }
  }, [isOpen, dealId, isMounted])

  if (!isOpen) return null

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      NEW: "bg-blue-500",
      Лиды: "bg-cyan-500",
      Переговоры: "bg-yellow-500",
      КП: "bg-orange-500",
      Договор: "bg-purple-500",
      Оплата: "bg-green-500",
      Выполнено: "bg-emerald-500",
    }
    return colors[stage] || "bg-gray-500"
  }

  const handleStageChange = async (newStage: string) => {
    try {
      console.log("[v0] Changing stage to:", newStage)
      const response = await fetch(`/api/deals/${dealData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ stage: newStage }),
      })

      const result = await response.json()
      console.log("[v0] Stage change response:", result)

      if (response.ok && result.success) {
        const updatedDeal = { ...dealData, stage: newStage }
        setDealData(updatedDeal)
        onUpdate(updatedDeal)
      } else {
        console.error("[v0] Failed to update stage:", result.error)
        alert(`Ошибка при смене этапа: ${result.error || "Неизвестная ошибка"}`)
      }
    } catch (error) {
      console.error("[v0] Failed to update stage:", error)
      alert("Ошибка при смене этапа сделки")
    }
  }

  const handleFieldEdit = (field: string, value: any) => {
    setEditValues({ ...editValues, [field]: value })
  }

  const handleFieldSave = async (field: string) => {
    try {
      const response = await fetch(`/api/deals/${dealData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ [field]: editValues[field] }),
      })

      if (response.ok) {
        const updatedDeal = { ...dealData, [field]: editValues[field] }
        setDealData(updatedDeal)
        onUpdate(updatedDeal)
        setIsEditingField(null)
      }
    } catch (error) {
      console.error("Failed to update field:", error)
    }
  }

  const handleAddTask = () => {
    if (!newTask.content) return
    const task: Activity = {
      id: Date.now().toString(),
      type: "task",
      timestamp: new Date(),
      user: "Текущий пользователь",
      content: newTask.content,
      status: "pending",
      assignedTo: newTask.assignedTo,
      assignedTelegramId: newTask.assignedTelegramId,
    }
    setDealData({
      ...dealData,
      tasks: [...(dealData.tasks || []), task],
    })
    setNewTask({ content: "", assignedTo: "", assignedTelegramId: "" })
  }

  const handleToggleTaskStatus = (taskId: string) => {
    setDealData({
      ...dealData,
      tasks: dealData.tasks.map((task) =>
        task.id === taskId ? { ...task, status: task.status === "completed" ? "pending" : "completed" } : task,
      ),
    })
  }

  const handleDeleteTask = (taskId: string) => {
    setDealData({
      ...dealData,
      tasks: dealData.tasks.filter((task) => task.id !== taskId),
    })
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return
    const newActivity: Activity = {
      id: Date.now().toString(),
      type: "comment",
      timestamp: new Date(),
      user: "Текущий пользователь",
      content: messageInput,
    }
    setDealData({
      ...dealData,
      activities: [...(dealData.activities || []), newActivity],
    })
    setMessageInput("")
  }

  // Calculate indicators (only for franchisee/admin)
  const totalRevenue = dealData.amount || 0
  const royalty = totalRevenue * 0.07

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${getStageColor(dealData.stage)}`} />
            <div>
              <h2 className="text-xl font-bold text-foreground">{dealData.title || "Без названия"}</h2>
              <p className="text-sm text-muted-foreground">ID: {dealData.id?.slice(0, 8)}...</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDelete}
              className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
              title="Удалить сделку"
            >
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stage Selector */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Этап сделки</h3>
                <div className="flex flex-wrap gap-2">
                  {stages.map((stage) => (
                    <button
                      key={stage}
                      onClick={() => handleStageChange(stage)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        dealData.stage === stage
                          ? `${getStageColor(stage)} text-white`
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deal Details */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Детали сделки</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <DollarSign size={18} className="text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Сумма</p>
                      <p className="text-sm font-medium text-foreground">{(dealData.amount || 0).toLocaleString()} ₽</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">{role === "uk" ? "Целевой город" : "Локация"}</p>
                      <p className="text-sm font-medium text-foreground">{dealData.location || "Не указана"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-orange-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Источник</p>
                      <p className="text-sm font-medium text-foreground">{dealData.source || "Не указан"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Создана</p>
                      <p className="text-sm font-medium text-foreground">
                        {dealData.createdAt ? new Date(dealData.createdAt).toLocaleDateString("ru-RU") : "Неизвестно"}
                      </p>
                    </div>
                  </div>

                  {role !== "uk" && (
                    <>
                      <div className="flex items-center gap-3">
                        <Users size={18} className="text-cyan-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Участники</p>
                          <p className="text-sm font-medium text-foreground">{dealData.participants || 0} чел.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Package size={18} className="text-pink-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Пакет</p>
                          {isEditingField === "package" ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={editValues.package || dealData.package || ""}
                                onChange={(e) => handleFieldEdit("package", e.target.value)}
                                className="bg-background border border-border rounded px-2 py-1 text-sm"
                              >
                                <option value="">Не выбран</option>
                                <option value="Стандарт">Стандарт</option>
                                <option value="Премиум">Премиум</option>
                                <option value="VIP">VIP</option>
                              </select>
                              <button onClick={() => handleFieldSave("package")} className="text-primary">
                                <Save size={14} />
                              </button>
                            </div>
                          ) : (
                            <p
                              className="text-sm font-medium text-foreground cursor-pointer hover:text-primary"
                              onClick={() => setIsEditingField("package")}
                            >
                              {dealData.package || "Не выбран"}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {role !== "uk" && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Расчетные Показатели</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Revenue:</p>
                      <p className="text-lg font-bold text-green-500">{totalRevenue.toLocaleString()} ₽</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Royalty (7%):</p>
                      <p className="text-lg font-bold text-blue-500">{royalty.toLocaleString()} ₽</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Задачи</h3>

                {/* Add new task */}
                <div className="flex flex-col gap-2 mb-4">
                  <input
                    type="text"
                    value={newTask.content}
                    onChange={(e) => setNewTask({ ...newTask, content: e.target.value })}
                    placeholder="Новая задача..."
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                  />
                  {role === "uk" && (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newTask.assignedTo}
                        onChange={(e) => {
                          const manager = managers.find((m) => m.id === e.target.value)
                          setNewTask({
                            ...newTask,
                            assignedTo: e.target.value,
                            assignedTelegramId: manager?.telegramId || "",
                          })
                        }}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Назначить сотруднику УК</option>
                        {managers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newTask.assignedTelegramId}
                        onChange={(e) => setNewTask({ ...newTask, assignedTelegramId: e.target.value })}
                        placeholder="Telegram ID"
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleAddTask}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Добавить задачу
                  </button>
                </div>

                {/* Task list */}
                <div className="space-y-2">
                  {(dealData.tasks || []).map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        task.status === "completed" ? "bg-muted/50 border-border" : "bg-background border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleTaskStatus(task.id)}
                          className={`p-1 rounded ${
                            task.status === "completed" ? "text-green-500" : "text-muted-foreground"
                          }`}
                        >
                          {task.status === "completed" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        </button>
                        <div>
                          <p
                            className={`text-sm ${
                              task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {task.content}
                          </p>
                          {task.assignedTo && (
                            <p className="text-xs text-muted-foreground">
                              Назначено: {managers.find((m) => m.id === task.assignedTo)?.name || task.assignedTo}
                              {task.assignedTelegramId && ` (@${task.assignedTelegramId})`}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!dealData.tasks || dealData.tasks.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Нет задач</p>
                  )}
                </div>
              </div>

              {/* Activity / Comments */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Активность</h3>

                <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                  {(dealData.activities || []).map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          activity.type === "comment" ? "bg-blue-500/20" : "bg-green-500/20"
                        }`}
                      >
                        {activity.type === "comment" ? (
                          <MessageCircle size={14} className="text-blue-500" />
                        ) : (
                          <CheckCircle size={14} className="text-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{activity.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.user} • {new Date(activity.timestamp).toLocaleString("ru-RU")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!dealData.activities || dealData.activities.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Нет активности</p>
                  )}
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Написать комментарий..."
                    className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Contact & Responsible */}
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Контакт</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{dealData.contact?.name || dealData.title || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{dealData.contact?.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{dealData.contact?.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Send size={16} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {dealData.contact?.telegramId ? `@${dealData.contact.telegramId}` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Responsible Manager */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Ответственный менеджер</h3>
                {role === "uk" || role === "super_admin" ? (
                  <select
                    value={editValues.responsibleId || ""}
                    onChange={(e) => {
                      handleFieldEdit("responsibleId", e.target.value)
                      handleFieldSave("responsibleId")
                    }}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Не назначен</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.telegramId && `(@${m.telegramId})`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{dealData.responsible || "Не назначен"}</p>
                      <p className="text-xs text-muted-foreground">Менеджер</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
