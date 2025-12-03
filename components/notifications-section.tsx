"use client"

import { useState } from "react"
import { AlertTriangle, AlertCircle, CheckCircle, Info, Bell, Trash2, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { NotificationDetailModal } from "./notification-detail-modal"

interface Notification {
  id: string
  type: "critical" | "warning" | "info" | "success" | "message"
  title: string
  message: string
  timestamp: string
  read: boolean
  location?: string
  dealId?: string
  comments: string[]
  archived: boolean
  sender?: string
}

interface NotificationsSectionProps {
  role: "uk" | "franchisee"
}

export function NotificationsSection({ role }: NotificationsSectionProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "N-001",
      type: "critical",
      title: "Критический сбой в системе",
      message: "Франчайзи №12 (Москва) нарушил стандарт качества. Необходимо срочное вмешательство.",
      timestamp: "2 минуты назад",
      read: false,
      location: "Москва",
      dealId: "DEAL-2512",
      comments: [],
      archived: false,
    },
    {
      id: "N-002",
      type: "warning",
      title: "Задержка платежа",
      message: "Франчайзи №18 не произвел оплату роялти в установленный срок.",
      timestamp: "1 час назад",
      read: false,
      location: "СПб",
      dealId: "DEAL-2513",
      comments: [],
      archived: false,
    },
    {
      id: "N-003",
      type: "warning",
      title: "Снижение производительности",
      message: "Франчайзи №5 показывает 65% от плана продаж. Рекомендуется проверка.",
      timestamp: "3 часа назад",
      read: false,
      location: "Казань",
      dealId: "DEAL-2514",
      comments: [],
      archived: false,
    },
    {
      id: "N-004",
      type: "info",
      title: "Новое приглашение от партнера",
      message: "Франчайзи №45 пригласил новых инвесторов. Ознакомьтесь с деталями.",
      timestamp: "Вчера",
      read: true,
      location: "Екатеринбург",
      dealId: "DEAL-2515",
      comments: [],
      archived: false,
    },
    {
      id: "N-005",
      type: "success",
      title: "Новый франчайзи активирован",
      message: "Франчайзи №51 (Новосибирск) успешно завершил процесс регистрации.",
      timestamp: "2 дня назад",
      read: true,
      location: "Новосибирск",
      dealId: "DEAL-2516",
      comments: [],
      archived: false,
    },
    {
      id: "N-006",
      type: "critical",
      title: "Сбой платежной системы",
      message: "Транзакция T-2025-1142 не прошла. Возможна проблема с интеграцией.",
      timestamp: "2 дня назад",
      read: true,
      location: "Москва",
      dealId: "DEAL-2517",
      comments: [],
      archived: false,
    },
    {
      id: "N-007",
      type: "info",
      title: "Обновление базы знаний",
      message: "Добавлена новая статья: 'Полное руководство по финансовому учету'",
      timestamp: "3 дня назад",
      read: true,
      location: "Екатеринбург",
      dealId: "DEAL-2518",
      comments: [],
      archived: false,
    },
    {
      id: "N-008",
      type: "message",
      title: "Сообщение от Управляющей Компании",
      message:
        "Пожалуйста, обратите внимание на качество обслуживания. Получены отзывы о задержках в обслуживании клиентов.",
      timestamp: "10 минут назад",
      read: false,
      location: "Москва",
      comments: [],
      archived: false,
      sender: "УК QuestLegends",
    },
  ])

  const [filterType, setFilterType] = useState("all")
  const [filterRead, setFilterRead] = useState("unread")
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const getIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertTriangle size={20} className="text-red-500" />
      case "warning":
        return <AlertCircle size={20} className="text-orange-500" />
      case "success":
        return <CheckCircle size={20} className="text-green-500" />
      case "message":
        return <MessageSquare size={20} className="text-purple-500" />
      default:
        return <Info size={20} className="text-blue-500" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "critical":
        return "Критичное"
      case "warning":
        return "Предупреждение"
      case "success":
        return "Успех"
      case "message":
        return "Сообщение"
      default:
        return "Информация"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-red-500/20 text-red-500 border-red-500/30"
      case "warning":
        return "bg-orange-500/20 text-orange-500 border-orange-500/30"
      case "success":
        return "bg-green-500/20 text-green-500 border-green-500/30"
      case "message":
        return "bg-purple-500/20 text-purple-500 border-purple-500/30"
      default:
        return "bg-blue-500/20 text-blue-500 border-blue-500/30"
    }
  }

  const filteredNotifications = notifications.filter(
    (n) =>
      !n.archived &&
      (filterType === "all" || n.type === filterType) &&
      (filterRead === "all" || (filterRead === "unread" && !n.read) || (filterRead === "read" && n.read)),
  )

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id))
  }

  const addCommentAndArchive = (id: string) => {
    const comment = commentInputs[id]?.trim()
    if (comment) {
      setNotifications(
        notifications.map((n) =>
          n.id === id
            ? {
                ...n,
                comments: [...n.comments, comment],
                archived: true,
              }
            : n,
        ),
      )
      setCommentInputs({ ...commentInputs, [id]: "" })
    }
  }

  const unreadCount = notifications.filter((n) => !n.read && !n.archived).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Уведомления / Сбои</h1>
          <p className="text-sm text-muted-foreground mt-1">Система оповещения и управление инцидентами</p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
          <Bell size={18} className="text-primary" />
          <span className="text-sm font-medium text-foreground">{unreadCount} новых</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterRead("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterRead === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setFilterRead("unread")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterRead === "unread"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Непрочитанные ({unreadCount})
          </button>
          <button
            onClick={() => setFilterRead("read")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterRead === "read"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Прочитанные
          </button>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-card border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">Все типы</option>
          <option value="message">Сообщения от УК</option>
          <option value="warning">Предупреждения</option>
          <option value="info">Информация</option>
          <option value="success">Успех</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 transition-all ${
                notification.read ? "bg-card border-border/50" : "bg-card border-border bg-primary/5"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{notification.title}</h3>
                      {notification.sender && <p className="text-xs text-purple-500 mt-1">От: {notification.sender}</p>}
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    </div>
                    <Badge className={`flex-shrink-0 ${getTypeColor(notification.type)}`}>
                      {getTypeLabel(notification.type)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap mt-3">
                    <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                    {notification.location && (
                      <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                        📍 {notification.location}
                      </span>
                    )}
                    {notification.dealId && (
                      <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                        {notification.dealId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                    <button
                      onClick={() => {
                        setSelectedNotification(notification)
                        setShowDetailModal(true)
                      }}
                      className="text-xs px-3 py-1 rounded bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 transition-colors"
                    >
                      Подробно
                    </button>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs px-3 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                      >
                        Отметить прочитанным
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-xs px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                      <Trash2 size={14} className="inline mr-1" />
                      Удалить
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/30 flex gap-2">
                    <input
                      type="text"
                      placeholder="Добавить комментарий и архивировать..."
                      value={commentInputs[notification.id] || ""}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [notification.id]: e.target.value })}
                      onKeyPress={(e) => e.key === "Enter" && addCommentAndArchive(notification.id)}
                      className="flex-1 bg-muted/20 border border-border rounded px-2 py-1 text-xs outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => addCommentAndArchive(notification.id)}
                      className="text-xs px-3 py-1 rounded bg-green-500/20 text-green-600 hover:bg-green-500/30 transition-colors"
                    >
                      Архив
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <Bell size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Нет уведомлений по данным фильтрам</p>
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-4">Настройки уведомлений</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
            <span className="text-sm text-foreground">Получать критические оповещения</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
            <span className="text-sm text-foreground">Получать предупреждения о платежах</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
            <span className="text-sm text-foreground">Email уведомления</span>
          </label>
        </div>
      </div>

      {/* Notification Detail Modal */}
      <NotificationDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        notification={selectedNotification || undefined}
        onAddComment={(comment) => {
          if (selectedNotification) {
            const updated = notifications.map((n) =>
              n.id === selectedNotification.id ? { ...n, comments: [...n.comments, comment] } : n,
            )
            setNotifications(updated)
            setSelectedNotification({
              ...selectedNotification,
              comments: [...selectedNotification.comments, comment],
            })
          }
        }}
      />
    </div>
  )
}
