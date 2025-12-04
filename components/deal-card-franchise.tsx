"use client"

import { useState, useEffect } from "react"
import {
  X,
  Edit2,
  Save,
  DollarSign,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  Plus,
  Paperclip,
  Send,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Building2,
  Briefcase,
  ChevronDown,
  TrendingUp,
} from "lucide-react"

interface DealFranchiseData {
  id: string
  title: string
  stage: string
  contactName: string
  company: string
  region: string
  leadSource: string
  responsibleManager: string
  nextContactDate: Date
  franchiseFee: number
  paybackPeriod: string
  createdAt: Date
  activities: Array<{
    id: string
    type: "event" | "comment" | "message" | "task" | "document"
    user: string
    content: string
    timestamp: Date
    status?: "pending" | "completed"
  }>
  contact: {
    name: string
    phone: string
    email: string
    position?: string
  }
  documents: Array<{
    id: string
    name: string
    type: string
    uploadedAt: Date
    url: string
  }>
}

interface DealCardFranchiseProps {
  deal: DealFranchiseData
  role: string
  onClose: () => void
  onUpdate: (updatedData: Partial<DealFranchiseData>) => void
}

export function DealCardFranchise({ deal, role, onClose, onUpdate }: DealCardFranchiseProps) {
  const [isEditingField, setIsEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [messageInput, setMessageInput] = useState("")
  const [activeTab, setActiveTab] = useState<"overview" | "activities" | "tasks" | "files">("overview")
  const [editField, setEditField] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [managers, setManagers] = useState<string[]>([])
  const [loadingManagers, setLoadingManagers] = useState(true)

  useEffect(() => {
    fetchManagers()
  }, [])

  const fetchManagers = async () => {
    try {
      const response = await fetch("/api/users?role=uk,franchisee")
      if (response.ok) {
        const users = await response.json()
        setManagers(users.map((u: any) => u.name))
      }
    } catch (error) {
      console.error("[v0] Error fetching managers:", error)
    } finally {
      setLoadingManagers(false)
    }
  }

  // Stage options for B2B CRM
  const stageOptions = ["Лид", "Переговоры", "Франшиза открыта", "Потеряна"]
  const leadSources = ["Выставка", "Сайт", "Холодный звонок", "Партнер", "Рекомендация", "Соцсети"]
  const regions = ["Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Новосибирск"]

  const handleFieldEdit = (field: string, value: any) => {
    setIsEditingField(field)
    setEditValues({ ...editValues, [field]: value })
  }

  const handleFieldSave = (field: string) => {
    onUpdate({ [field]: editValues[field] })
    setIsEditingField(null)
  }

  const handleContactEdit = (field: string, value: any) => {
    const updatedContact = { ...deal.contact, [field]: value }
    onUpdate({ contact: updatedContact })
    setIsEditingField(null)
  }

  const handleStageChange = (newStage: string) => {
    onUpdate({ stage: newStage })

    // Add activity for stage change
    const newActivity = {
      id: `act-${Date.now()}`,
      type: "event" as const,
      user: "Система",
      content: `Стадия изменена на "${newStage}"`,
      timestamp: new Date(),
    }

    onUpdate({
      activities: [...deal.activities, newActivity],
    })
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return

    const newActivity = {
      id: `act-${Date.now()}`,
      type: "comment" as const,
      user: "Текущий пользователь",
      content: messageInput,
      timestamp: new Date(),
    }

    onUpdate({
      activities: [...deal.activities, newActivity],
    })

    setMessageInput("")
  }

  const handleAddTask = (taskContent: string) => {
    const newActivity = {
      id: `act-${Date.now()}`,
      type: "task" as const,
      user: "Текущий пользователь",
      content: taskContent,
      timestamp: new Date(),
      status: "pending" as const,
    }

    onUpdate({
      activities: [...deal.activities, newActivity],
    })
  }

  const toggleTaskStatus = (activityId: string) => {
    const updatedActivities = deal.activities.map((act) =>
      act.id === activityId ? { ...act, status: act.status === "completed" ? "pending" : ("completed" as const) } : act,
    )
    onUpdate({ activities: updatedActivities })
  }

  const handleFileUpload = () => {
    // Simulate file upload
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: "Новый документ.pdf",
      type: "PDF",
      uploadedAt: new Date(),
      url: "#",
    }

    onUpdate({
      documents: [...deal.documents, newDoc],
    })

    // Add activity
    const newActivity = {
      id: `act-${Date.now()}`,
      type: "document" as const,
      user: "Текущий пользователь",
      content: `Загружен документ: ${newDoc.name}`,
      timestamp: new Date(),
    }

    onUpdate({
      activities: [...deal.activities, newActivity],
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-4">
            {isEditingField === "title" ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editValues.title || deal.title}
                  onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                  className="text-xl font-bold bg-background border border-border rounded px-2 py-1"
                  autoFocus
                />
                <button onClick={() => handleFieldSave("title")} className="text-primary">
                  <Save size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{deal.title}</h2>
                <button
                  onClick={() => handleFieldEdit("title", deal.title)}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}

            <div className="relative">
              <select
                value={deal.stage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="bg-primary/20 text-primary px-3 py-1 rounded-lg text-sm font-medium border border-primary/30 outline-none cursor-pointer appearance-none pr-8"
              >
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="text-primary absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Main Content - Three Columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Block - 35% */}
          <div className="w-[35%] border-r border-border overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Contact & Company Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Основные Детали</h3>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">ФИО Контакта</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "contactName" ? (
                      <>
                        <input
                          type="text"
                          value={editValues.contactName || deal.contactName}
                          onChange={(e) => setEditValues({ ...editValues, contactName: e.target.value })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                        />
                        <button onClick={() => handleFieldSave("contactName")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <User size={16} className="text-primary" />
                        <span className="text-sm font-medium text-foreground">{deal.contactName}</span>
                        <button
                          onClick={() => handleFieldEdit("contactName", deal.contactName)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Компания / Юр. Лицо</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "company" ? (
                      <>
                        <input
                          type="text"
                          value={editValues.company || deal.company}
                          onChange={(e) => setEditValues({ ...editValues, company: e.target.value })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                        />
                        <button onClick={() => handleFieldSave("company")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Building2 size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">{deal.company}</span>
                        <button
                          onClick={() => handleFieldEdit("company", deal.company)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Регион Открытия</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "region" ? (
                      <>
                        <select
                          value={editValues.region || deal.region}
                          onChange={(e) => setEditValues({ ...editValues, region: e.target.value })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                        >
                          {regions.map((reg) => (
                            <option key={reg} value={reg}>
                              {reg}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => handleFieldSave("region")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <MapPin size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">{deal.region}</span>
                        <button
                          onClick={() => handleFieldEdit("region", deal.region)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Источник Лида</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "leadSource" ? (
                      <>
                        <select
                          value={editValues.leadSource || deal.leadSource}
                          onChange={(e) => setEditValues({ ...editValues, leadSource: e.target.value })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                        >
                          {leadSources.map((src) => (
                            <option key={src} value={src}>
                              {src}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => handleFieldSave("leadSource")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <TrendingUp size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">{deal.leadSource}</span>
                        <button
                          onClick={() => handleFieldEdit("leadSource", deal.leadSource)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Ответственный Менеджер</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "responsibleManager" ? (
                      <>
                        <select
                          value={editValues.responsibleManager || deal.responsibleManager}
                          onChange={(e) => setEditValues({ ...editValues, responsibleManager: e.target.value })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                          disabled={loadingManagers}
                        >
                          {loadingManagers ? (
                            <option>Загрузка...</option>
                          ) : (
                            managers.map((mgr) => (
                              <option key={mgr} value={mgr}>
                                {mgr}
                              </option>
                            ))
                          )}
                        </select>
                        <button onClick={() => handleFieldSave("responsibleManager")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Briefcase size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">{deal.responsibleManager}</span>
                        <button
                          onClick={() => handleFieldEdit("responsibleManager", deal.responsibleManager)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Дата Следующего Контакта</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "nextContactDate" ? (
                      <>
                        <input
                          type="date"
                          value={
                            editValues.nextContactDate
                              ? new Date(editValues.nextContactDate).toISOString().split("T")[0]
                              : deal.nextContactDate.toISOString().split("T")[0]
                          }
                          onChange={(e) => setEditValues({ ...editValues, nextContactDate: new Date(e.target.value) })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                        />
                        <button onClick={() => handleFieldSave("nextContactDate")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Calendar size={16} className="text-primary" />
                        <span className="text-sm font-medium text-primary">
                          {deal.nextContactDate.toLocaleDateString("ru-RU")}
                        </span>
                        <button
                          onClick={() => handleFieldEdit("nextContactDate", deal.nextContactDate)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                    Финансовые Детали
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Паушальный Взнос</label>
                      <div className="flex items-center gap-2">
                        {isEditingField === "franchiseFee" ? (
                          <>
                            <input
                              type="number"
                              value={editValues.franchiseFee || deal.franchiseFee}
                              onChange={(e) => setEditValues({ ...editValues, franchiseFee: Number(e.target.value) })}
                              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                            />
                            <button onClick={() => handleFieldSave("franchiseFee")} className="text-primary">
                              <Save size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <DollarSign size={16} className="text-primary" />
                            <span className="text-sm font-bold text-primary">
                              {deal.franchiseFee.toLocaleString()} ₽
                            </span>
                            <button
                              onClick={() => handleFieldEdit("franchiseFee", deal.franchiseFee)}
                              className="ml-auto text-muted-foreground hover:text-primary"
                            >
                              <Edit2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Срок Окупаемости (план)</label>
                      <div className="flex items-center gap-2">
                        {isEditingField === "paybackPeriod" ? (
                          <>
                            <input
                              type="text"
                              value={editValues.paybackPeriod || deal.paybackPeriod}
                              onChange={(e) => setEditValues({ ...editValues, paybackPeriod: e.target.value })}
                              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                              placeholder="например: 12-18 месяцев"
                            />
                            <button onClick={() => handleFieldSave("paybackPeriod")} className="text-primary">
                              <Save size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <Clock size={16} className="text-muted-foreground" />
                            <span className="text-sm text-foreground">{deal.paybackPeriod}</span>
                            <button
                              onClick={() => handleFieldEdit("paybackPeriod", deal.paybackPeriod)}
                              className="ml-auto text-muted-foreground hover:text-primary"
                            >
                              <Edit2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Связанные Контакты</h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Имя контакта</label>
                    <div className="flex items-center gap-2">
                      {isEditingField === "contact.name" ? (
                        <>
                          <input
                            type="text"
                            value={editValues["contact.name"] || deal.contact.name}
                            onChange={(e) => setEditValues({ ...editValues, "contact.name": e.target.value })}
                            className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => {
                              handleContactEdit("name", editValues["contact.name"])
                            }}
                            className="text-primary"
                          >
                            <Save size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <User size={16} className="text-muted-foreground" />
                          <span className="text-sm text-foreground">{deal.contact.name}</span>
                          <button
                            onClick={() => handleFieldEdit("contact.name", deal.contact.name)}
                            className="ml-auto text-muted-foreground hover:text-primary"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Телефон</label>
                    <div className="flex items-center gap-2">
                      {isEditingField === "contact.phone" ? (
                        <>
                          <input
                            type="tel"
                            value={editValues["contact.phone"] || deal.contact.phone}
                            onChange={(e) => setEditValues({ ...editValues, "contact.phone": e.target.value })}
                            className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => {
                              handleContactEdit("phone", editValues["contact.phone"])
                            }}
                            className="text-primary"
                          >
                            <Save size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <Phone size={16} className="text-primary" />
                          <a href={`tel:${deal.contact.phone}`} className="text-sm text-primary hover:underline">
                            {deal.contact.phone}
                          </a>
                          <button
                            onClick={() => handleFieldEdit("contact.phone", deal.contact.phone)}
                            className="ml-auto text-muted-foreground hover:text-primary"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Email</label>
                    <div className="flex items-center gap-2">
                      {isEditingField === "contact.email" ? (
                        <>
                          <input
                            type="email"
                            value={editValues["contact.email"] || deal.contact.email}
                            onChange={(e) => setEditValues({ ...editValues, "contact.email": e.target.value })}
                            className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => {
                              handleContactEdit("email", editValues["contact.email"])
                            }}
                            className="text-primary"
                          >
                            <Save size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <Mail size={16} className="text-muted-foreground" />
                          <a href={`mailto:${deal.contact.email}`} className="text-sm text-foreground hover:underline">
                            {deal.contact.email}
                          </a>
                          <button
                            onClick={() => handleFieldEdit("contact.email", deal.contact.email)}
                            className="ml-auto text-muted-foreground hover:text-primary"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {deal.contact.position && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Должность</label>
                      <div className="flex items-center gap-2">
                        <Briefcase size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">{deal.contact.position}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center Block - Activity Feed - 40% */}
          <div className="w-[40%] flex flex-col border-r border-border">
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Лента Активности</h3>

              <div className="space-y-4">
                {deal.activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {activity.type === "event" && (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Clock size={14} className="text-primary" />
                        </div>
                      )}
                      {activity.type === "comment" && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <MessageCircle size={14} className="text-foreground" />
                        </div>
                      )}
                      {activity.type === "message" && (
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                          <Mail size={14} className="text-accent" />
                        </div>
                      )}
                      {activity.type === "task" && (
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          {activity.status === "completed" ? (
                            <CheckCircle size={14} className="text-green-500" />
                          ) : (
                            <AlertCircle size={14} className="text-yellow-500" />
                          )}
                        </div>
                      )}
                      {activity.type === "document" && (
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <FileText size={14} className="text-blue-500" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 bg-card border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{activity.user}</span>
                        <span className="text-xs text-muted-foreground">
                          {activity.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{activity.content}</p>
                      {activity.type === "task" && (
                        <button
                          onClick={() => toggleTaskStatus(activity.id)}
                          className="mt-2 text-xs text-primary hover:underline"
                        >
                          {activity.status === "completed" ? "Отменить выполнение" : "Отметить выполненной"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border p-4 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const taskContent = prompt("Введите описание задачи:")
                    if (taskContent) handleAddTask(taskContent)
                  }}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded text-sm flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Задача
                </button>
                <button className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded text-sm flex items-center gap-1.5">
                  <Phone size={14} />
                  Позвонить
                </button>
                <button className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded text-sm flex items-center gap-1.5">
                  <Mail size={14} />
                  Email
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleFileUpload}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Написать комментарий..."
                  className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Block - Documents - 25% */}
          <div className="w-[25%] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Документы Сделки</h3>

                <button
                  onClick={handleFileUpload}
                  className="w-full mb-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload size={16} />
                  Загрузить документ
                </button>

                <div className="space-y-2">
                  {deal.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <FileText size={20} className="text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.uploadedAt.toLocaleDateString("ru-RU")}</p>
                      </div>
                    </div>
                  ))}

                  {deal.documents.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Документов пока нет</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Информация</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Создана:</span>
                    <span className="text-foreground">{deal.createdAt.toLocaleDateString("ru-RU")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID сделки:</span>
                    <span className="text-foreground font-mono">{deal.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
