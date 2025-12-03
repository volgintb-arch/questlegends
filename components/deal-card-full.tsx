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
  Paperclip,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  ChevronDown,
  Edit2,
  Save,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react"

interface Activity {
  id: string
  type: "event" | "comment" | "message" | "task"
  timestamp: Date
  user: string
  content: string
  status?: "pending" | "completed"
}

interface Contact {
  name: string
  phone: string
  email: string
  company?: string
  socialLinks?: string[]
}

interface DealData {
  id: string
  title: string
  stage: string
  amount: number
  source: string
  createdAt: Date
  participants: number
  package: string
  location: string
  contact: Contact
  responsible: string
  activities: Activity[]
  tasks: Activity[]
  checkPerPerson: number // Чек на человека (NEW)
  animatorsCount: number // K_Аниматоров (manual input)
  animatorRate: number // Ставка Аниматора (manual input)
  hostRate: number // Ставка Ведущий (manual input)
  djRate: number // Ставка DJ (manual input)
}

interface DealCardFullProps {
  deal: DealData
  isOpen: boolean
  onClose: () => void
  onUpdate: (deal: DealData) => void
  onDelete: () => void
  role: "uk" | "franchisee" | "admin"
}

export function DealCardFull({ deal, isOpen, onClose, onUpdate, onDelete, role }: DealCardFullProps) {
  const [dealData, setDealData] = useState<DealData>(deal)
  const [messageInput, setMessageInput] = useState("")
  const [isEditingField, setIsEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [managers, setManagers] = useState<string[]>([])

  useEffect(() => {
    fetchManagers()
  }, [])

  const fetchManagers = async () => {
    try {
      const response = await fetch("/api/users?role=uk,uk_employee,franchisee,admin")
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        setManagers(data.data.map((user: any) => user.name))
      }
    } catch (error) {
      console.error("[v0] Error fetching managers:", error)
    }
  }

  const stageOptions =
    role === "uk"
      ? ["Лиды", "Переговоры", "Предложение", "Подписано"]
      : ["Лиды", "Переговоры", "Внесена предоплата (Бронь)", "Игра проведена"]

  const leadSources = ["Instagram", "VK", "Сайт", "Рекомендация", "Реклама", "Другое"]
  const packageOptions = ["Стандарт", "Премиум", "VIP", "Корпоратив"]
  const locations = ["Москва", "Санкт-Петербург", "Казань", "Новосибирск"]

  const handleStageChange = (newStage: string) => {
    const updatedDeal = { ...dealData, stage: newStage }
    setDealData(updatedDeal)
    onUpdate(updatedDeal)

    const newActivity: Activity = {
      id: Date.now().toString(),
      type: "event",
      timestamp: new Date(),
      user: "Система",
      content: `Сделка перешла на стадию "${newStage}"`,
    }
    setDealData({
      ...updatedDeal,
      activities: [newActivity, ...updatedDeal.activities],
    })

    if (newStage === "Игра проведена" || newStage === "Внесена предоплата (Бронь)") {
      console.log("[v0] Triggering webhook for stage:", newStage)
      // Backend webhook call would go here
    }
  }

  const handleFieldEdit = (field: string, value: any) => {
    setIsEditingField(field)
    setEditValues({ ...editValues, [field]: value })
  }

  const handleFieldSave = async (field: keyof DealData) => {
    const newValue = editValues[field]

    setDealData((prev) => ({
      ...prev,
      [field]: newValue,
    }))

    if (["animatorsCount", "animatorRate", "hostRate", "djRate"].includes(field)) {
      console.log("[v0] FOT field changed, recalculating...")
    }

    setIsEditingField(null)
    setEditValues({})
    onUpdate({ ...dealData, [field]: newValue })
  }

  const handleContactEdit = (contactField: keyof Contact, value: string) => {
    const updatedContact = { ...dealData.contact, [contactField]: value }
    const updatedDeal = { ...dealData, contact: updatedContact }
    setDealData(updatedDeal)
    onUpdate(updatedDeal)
    setIsEditingField(null)

    const newActivity: Activity = {
      id: Date.now().toString(),
      type: "event",
      timestamp: new Date(),
      user: "Вы",
      content: `Контактная информация обновлена`,
    }
    setDealData({
      ...updatedDeal,
      activities: [newActivity, ...updatedDeal.activities],
    })
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return

    const newMessage: Activity = {
      id: Date.now().toString(),
      type: "message",
      timestamp: new Date(),
      user: "Вы",
      content: messageInput,
    }

    setDealData({
      ...dealData,
      activities: [newMessage, ...dealData.activities],
    })
    setMessageInput("")
  }

  const handleAddTask = (taskContent: string) => {
    const newTask: Activity = {
      id: Date.now().toString(),
      type: "task",
      timestamp: new Date(),
      user: "Вы",
      content: taskContent,
      status: "pending",
    }

    setDealData({
      ...dealData,
      tasks: [...dealData.tasks, newTask],
      activities: [newTask, ...dealData.activities],
    })
  }

  const toggleTaskStatus = (taskId: string) => {
    const updatedTasks = dealData.tasks.map((task) =>
      task.id === taskId ? { ...task, status: task.status === "completed" ? "pending" : "completed" } : task,
    ) as Activity[]

    setDealData({ ...dealData, tasks: updatedTasks })
  }

  const totalRevenue = (dealData.participants || 0) * (dealData.checkPerPerson || 0)
  const fotCalculation =
    (dealData.animatorsCount || 0) * (dealData.animatorRate || 0) + (dealData.hostRate || 0) + (dealData.djRate || 0)

  const royaltyAmount = totalRevenue * 0.07

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-background border border-border rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-4">
            {isEditingField === "title" ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editValues.title || dealData.title}
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
                <h2 className="text-xl font-bold text-foreground">{dealData.title}</h2>
                <button
                  onClick={() => handleFieldEdit("title", dealData.title)}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}

            <div className="relative">
              <select
                value={dealData.stage}
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
          <div className="flex items-center gap-2">
            {(role === "franchisee" || role === "uk") && (
              <button
                onClick={onDelete}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors"
              >
                <Trash2 size={16} />
                <span>Удалить сделку</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Main Content - Three Columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Block - 35% */}
          <div className="w-[35%] border-r border-border overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Deal Fields Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Поля Сделки</h3>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Сумма сделки</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "amount" ? (
                      <>
                        <input
                          type="number"
                          value={editValues.amount || dealData.amount}
                          onChange={(e) => setEditValues({ ...editValues, amount: Number(e.target.value) })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                        />
                        <button onClick={() => handleFieldSave("amount")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <DollarSign size={16} className="text-primary" />
                        <span className="text-lg font-bold text-primary">{dealData.amount.toLocaleString()} ₽</span>
                        <button
                          onClick={() => handleFieldEdit("amount", dealData.amount)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Источник лида</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "source" ? (
                      <>
                        <select
                          value={editValues.source || dealData.source}
                          onChange={(e) => setEditValues({ ...editValues, source: e.target.value })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                        >
                          {leadSources.map((src) => (
                            <option key={src} value={src}>
                              {src}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => handleFieldSave("source")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-foreground">{dealData.source}</span>
                        <button
                          onClick={() => handleFieldEdit("source", dealData.source)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Created Date */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Дата создания</label>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{dealData.createdAt.toLocaleDateString("ru-RU")}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Количество участников (N)</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "participants" ? (
                      <>
                        <input
                          type="number"
                          value={editValues.participants || dealData.participants}
                          onChange={(e) => setEditValues({ ...editValues, participants: Number(e.target.value) })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                          min="1"
                        />
                        <button onClick={() => handleFieldSave("participants")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Users size={16} className="text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{dealData.participants}</span>
                        <button
                          onClick={() => handleFieldEdit("participants", dealData.participants)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Выбранный пакет</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "package" ? (
                      <>
                        <select
                          value={editValues.package || dealData.package}
                          onChange={(e) => setEditValues({ ...editValues, package: e.target.value })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                        >
                          {packageOptions.map((pkg) => (
                            <option key={pkg} value={pkg}>
                              {pkg}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => handleFieldSave("package")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Package size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">{dealData.package}</span>
                        <button
                          onClick={() => handleFieldEdit("package", dealData.package)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Локация</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "location" ? (
                      <>
                        <select
                          value={editValues.location || dealData.location}
                          onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                        >
                          {locations.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => handleFieldSave("location")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <MapPin size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">{dealData.location}</span>
                        <button
                          onClick={() => handleFieldEdit("location", dealData.location)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Ответственный менеджер</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "responsible" ? (
                      <>
                        <select
                          value={editValues.responsible || dealData.responsible}
                          onChange={(e) => setEditValues({ ...editValues, responsible: e.target.value })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                        >
                          {managers.map((mgr) => (
                            <option key={mgr} value={mgr}>
                              {mgr}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => handleFieldSave("responsible")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <User size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">{dealData.responsible}</span>
                        <button
                          onClick={() => handleFieldEdit("responsible", dealData.responsible)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Чек на человека (₽)</label>
                  <div className="flex items-center gap-2">
                    {isEditingField === "checkPerPerson" ? (
                      <>
                        <input
                          type="number"
                          value={editValues.checkPerPerson || dealData.checkPerPerson}
                          onChange={(e) => setEditValues({ ...editValues, checkPerPerson: Number(e.target.value) })}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                          min="0"
                        />
                        <button onClick={() => handleFieldSave("checkPerPerson")} className="text-primary">
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <DollarSign size={16} className="text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          {(dealData.checkPerPerson || 0).toLocaleString()} ₽
                        </span>
                        <button
                          onClick={() => handleFieldEdit("checkPerPerson", dealData.checkPerPerson)}
                          className="ml-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {role !== "uk" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Кол-во Аниматоров (K)</label>
                      <div className="flex items-center gap-2">
                        {isEditingField === "animatorsCount" ? (
                          <>
                            <input
                              type="number"
                              value={editValues.animatorsCount || dealData.animatorsCount}
                              onChange={(e) => setEditValues({ ...editValues, animatorsCount: Number(e.target.value) })}
                              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                              min="1"
                            />
                            <button onClick={() => handleFieldSave("animatorsCount")} className="text-primary">
                              <Save size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <Users size={16} className="text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">{dealData.animatorsCount}</span>
                            <button
                              onClick={() => handleFieldEdit("animatorsCount", dealData.animatorsCount)}
                              className="ml-auto text-muted-foreground hover:text-primary"
                            >
                              <Edit2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Ставка Аниматора (₽)</label>
                      <div className="flex items-center gap-2">
                        {isEditingField === "animatorRate" ? (
                          <>
                            <input
                              type="number"
                              value={editValues.animatorRate || dealData.animatorRate}
                              onChange={(e) => setEditValues({ ...editValues, animatorRate: Number(e.target.value) })}
                              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                              min="0"
                            />
                            <button onClick={() => handleFieldSave("animatorRate")} className="text-primary">
                              <Save size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <DollarSign size={16} className="text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {(dealData.animatorRate || 0).toLocaleString()} ₽
                            </span>
                            <button
                              onClick={() => handleFieldEdit("animatorRate", dealData.animatorRate)}
                              className="ml-auto text-muted-foreground hover:text-primary"
                            >
                              <Edit2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Ставка Ведущий (₽)</label>
                      <div className="flex items-center gap-2">
                        {isEditingField === "hostRate" ? (
                          <>
                            <input
                              type="number"
                              value={editValues.hostRate || dealData.hostRate}
                              onChange={(e) => setEditValues({ ...editValues, hostRate: Number(e.target.value) })}
                              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                              min="0"
                            />
                            <button onClick={() => handleFieldSave("hostRate")} className="text-primary">
                              <Save size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <DollarSign size={16} className="text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {(dealData.hostRate || 0).toLocaleString()} ₽
                            </span>
                            <button
                              onClick={() => handleFieldEdit("hostRate", dealData.hostRate)}
                              className="ml-auto text-muted-foreground hover:text-primary"
                            >
                              <Edit2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Ставка DJ (₽)</label>
                      <div className="flex items-center gap-2">
                        {isEditingField === "djRate" ? (
                          <>
                            <input
                              type="number"
                              value={editValues.djRate || dealData.djRate}
                              onChange={(e) => setEditValues({ ...editValues, djRate: Number(e.target.value) })}
                              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                              min="0"
                            />
                            <button onClick={() => handleFieldSave("djRate")} className="text-primary">
                              <Save size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <DollarSign size={16} className="text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {(dealData.djRate || 0).toLocaleString()} ₽
                            </span>
                            <button
                              onClick={() => handleFieldEdit("djRate", dealData.djRate)}
                              className="ml-auto text-muted-foreground hover:text-primary"
                            >
                              <Edit2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-border">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
                    Расчетные Показатели
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Total Revenue:</span>
                      <span className="text-sm font-bold text-green-500">{totalRevenue.toLocaleString()} ₽</span>
                    </div>
                    {/* Only show fotCalculation for Franchisee and Admin */}
                    {role !== "uk" && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">FOT Calculation:</span>
                        <span className="text-sm font-bold text-purple-500">{fotCalculation.toLocaleString()} ₽</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Royalty (7%):</span>
                      <span className="text-sm font-bold text-orange-500">{royaltyAmount.toLocaleString()} ₽</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Связанные Контакты</h3>

                <div className="space-y-3">
                  {/* Contact Name */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Имя контакта</label>
                    <div className="flex items-center gap-2">
                      {isEditingField === "contact.name" ? (
                        <>
                          <input
                            type="text"
                            value={editValues["contact.name"] || dealData.contact.name}
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
                          <span className="text-sm text-foreground">{dealData.contact.name}</span>
                          <button
                            onClick={() => handleFieldEdit("contact.name", dealData.contact.name)}
                            className="ml-auto text-muted-foreground hover:text-primary"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Телефон</label>
                    <div className="flex items-center gap-2">
                      {isEditingField === "contact.phone" ? (
                        <>
                          <input
                            type="tel"
                            value={editValues["contact.phone"] || dealData.contact.phone}
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
                          <a href={`tel:${dealData.contact.phone}`} className="text-sm text-primary hover:underline">
                            {dealData.contact.phone}
                          </a>
                          <button
                            onClick={() => handleFieldEdit("contact.phone", dealData.contact.phone)}
                            className="ml-auto text-muted-foreground hover:text-primary"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Email</label>
                    <div className="flex items-center gap-2">
                      {isEditingField === "contact.email" ? (
                        <>
                          <input
                            type="email"
                            value={editValues["contact.email"] || dealData.contact.email}
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
                          <a
                            href={`mailto:${dealData.contact.email}`}
                            className="text-sm text-foreground hover:underline"
                          >
                            {dealData.contact.email}
                          </a>
                          <button
                            onClick={() => handleFieldEdit("contact.email", dealData.contact.email)}
                            className="ml-auto text-muted-foreground hover:text-primary"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Company */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Компания</label>
                    <div className="flex items-center gap-2">
                      {isEditingField === "contact.company" ? (
                        <>
                          <input
                            type="text"
                            value={editValues["contact.company"] || dealData.contact.company || ""}
                            onChange={(e) => setEditValues({ ...editValues, "contact.company": e.target.value })}
                            className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => {
                              handleContactEdit("company", editValues["contact.company"])
                            }}
                            className="text-primary"
                          >
                            <Save size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-foreground">{dealData.contact.company || "Не указано"}</span>
                          <button
                            onClick={() => handleFieldEdit("contact.company", dealData.contact.company || "")}
                            className="ml-auto text-muted-foreground hover:text-primary"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Social Links */}
                  {dealData.contact.socialLinks && dealData.contact.socialLinks.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Социальные сети</label>
                      <div className="space-y-1">
                        {dealData.contact.socialLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <ExternalLink size={14} />
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center Block - 65% */}
          <div className="flex-1 flex flex-col">
            {/* Activity Feed */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Лента Активности</h3>

              <div className="space-y-4">
                {dealData.activities.map((activity) => (
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
              {/* Quick Actions */}
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

              {/* Message Input */}
              <div className="flex gap-2">
                <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Написать сообщение или комментарий..."
                  className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Send size={16} />
                  <span className="text-sm">Отправить</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
