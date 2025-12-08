"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, AlertCircle, CheckCircle, Info, Bell, Trash2, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { NotificationDetailModal } from "./notification-detail-modal"
import { useAuth } from "@/contexts/auth-context"

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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState("all")
  const [filterRead, setFilterRead] = useState("unread")
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const { getAuthHeaders } = useAuth()

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

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ isRead: true }),
      })
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      setNotifications(notifications.filter((n) => n.id !== id))
    } catch (error) {
      console.error("[v0] Error deleting notification:", error)
    }
  }

  const addCommentAndArchive = async (id: string) => {
    const comment = commentInputs[id]?.trim()
    if (!comment) return

    try {
      await fetch(`/api/notifications/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ text: comment }),
      })

      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ isArchived: true }),
      })

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
    } catch (error) {
      console.error("[v0] Error archiving notification:", error)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read && !n.archived).length

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/notifications?type=${filterType}&read=${filterRead}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          console.error("[v0] Error fetching notifications:", response.status)
          setNotifications([])
          return
        }

        const data = await response.json()

        if (data.success && data.data?.notifications) {
          // Transform API data to component format
          const transformed = data.data.notifications.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            timestamp: new Date(n.createdAt).toLocaleString("ru-RU"),
            read: n.isRead,
            location: n.location,
            dealId: n.deal?.id,
            comments: n.comments?.map((c: any) => c.text) || [],
            archived: n.isArchived,
            sender: n.sender?.name,
          }))
          setNotifications(transformed)
        } else {
          setNotifications([])
        }
      } catch (error) {
        console.error("[v0] Error fetching notifications:", error)
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [filterType, filterRead, getAuthHeaders])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Загрузка уведомлений...</div>
      </div>
    )
  }

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
