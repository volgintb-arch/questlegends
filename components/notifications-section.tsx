"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, AlertCircle, CheckCircle, Info, Bell, BellRing, Trash2, MessageSquare, ExternalLink, Banknote, Archive } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { NotificationDetailModal } from "./notification-detail-modal"
import { useAuth } from "@/contexts/auth-context"
import { usePushNotifications } from "@/hooks/use-push-notifications"

interface Notification {
  id: string
  type: "critical" | "warning" | "info" | "success" | "message" | "task" | "royalty_payment"
  title: string
  message: string
  timestamp: string
  read: boolean
  location?: string
  dealId?: string
  taskId?: string
  comments: string[]
  archived: boolean
  sender?: string
}

interface NotificationsSectionProps {
  role: "uk" | "franchisee"
}

export function NotificationsSection({ role }: NotificationsSectionProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [archivedNotifications, setArchivedNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState("all")
  const [filterRead, setFilterRead] = useState("unread")
  const [activeTab, setActiveTab] = useState<"active" | "archive">("active")
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const { getAuthHeaders, user } = useAuth()
  const router = useRouter()
  const isUkRole = user?.role === "uk" || user?.role === "uk_employee" || user?.role === "super_admin"
  const push = usePushNotifications(getAuthHeaders)

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
      case "task":
        return <CheckCircle size={20} className="text-primary" />
      case "royalty_payment":
        return <Banknote size={20} className="text-amber-500" />
      default:
        return <Info size={20} className="text-primary" />
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
      case "task":
        return "Задача"
      case "royalty_payment":
        return "Роялти"
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
      case "task":
        return "bg-primary/20 text-primary border-primary/30"
      case "royalty_payment":
        return "bg-amber-500/20 text-amber-500 border-amber-500/30"
      default:
        return "bg-primary/20 text-primary border-primary/30"
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

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read on any click
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    // Navigate based on type
    if (notification.dealId) {
      const taskParam = notification.taskId ? `&taskId=${notification.taskId}` : ""
      router.push(`/crm?dealId=${notification.dealId}${taskParam}`)
    } else if (notification.type === "message") {
      router.push("/messages")
    } else if (notification.type === "royalty_payment") {
      router.push("/finances")
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

  const confirmRoyaltyPayment = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/confirm-payment`, {
        method: "POST",
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        // Remove all royalty_payment notifications with same marker (they get archived server-side)
        setNotifications(notifications.filter((n) => {
          if (n.type !== "royalty_payment") return true
          // The confirmed one and related ones will be archived on server
          // For simplicity, remove all unarchived royalty notifications
          return n.id !== id
        }))
        // Re-fetch to get updated list
        const response = await fetch(`/api/notifications?type=${filterType}&read=${filterRead}`, {
          headers: getAuthHeaders(),
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data?.notifications) {
            const transformed = data.data.notifications.map((n: any) => ({
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message,
              timestamp: new Date(n.createdAt).toLocaleString("ru-RU"),
              read: n.isRead,
              location: n.location,
              dealId: n.dealId,
              taskId: n.taskId,
              comments: n.comments?.map((c: any) => c.text) || [],
              archived: n.isArchived,
              sender: n.sender?.name,
            }))
            setNotifications(transformed)
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error confirming royalty payment:", error)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read && !n.archived).length

  const handleViewNotification = (notification: Notification) => {
    setSelectedNotification(notification)
    setShowDetailModal(true)
  }

  const transformNotifications = (data: any[]) =>
    data.map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: new Date(n.createdAt).toLocaleString("ru-RU"),
      read: n.isRead,
      location: n.location,
      dealId: n.dealId,
      taskId: n.taskId,
      comments: n.comments?.map((c: any) => c.text) || [],
      archived: n.isArchived,
      sender: n.sender?.name,
    }))

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true)

        if (activeTab === "archive") {
          const response = await fetch(`/api/notifications?archived=true`, {
            headers: getAuthHeaders(),
          })
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data?.notifications) {
              setArchivedNotifications(transformNotifications(data.data.notifications))
            } else {
              setArchivedNotifications([])
            }
          }
        } else {
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
            setNotifications(transformNotifications(data.data.notifications))
          } else {
            setNotifications([])
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching notifications:", error)
        if (activeTab === "archive") setArchivedNotifications([])
        else setNotifications([])
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [filterType, filterRead, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Tabs: Active / Archive */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "active"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Bell size={14} className="inline mr-1.5 -mt-0.5" />
          Активные
        </button>
        <button
          onClick={() => setActiveTab("archive")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "archive"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Archive size={14} className="inline mr-1.5 -mt-0.5" />
          Архив (7 дней)
        </button>
      </div>

      {/* Filters — only for active tab */}
      {activeTab === "active" && (
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
            className="bg-popover border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="all">Все типы</option>
            <option value="royalty_payment">Роялти</option>
            <option value="task">Задачи</option>
            <option value="message">Сообщения от УК</option>
            <option value="warning">Предупреждения</option>
            <option value="info">Информация</option>
            <option value="success">Успех</option>
          </select>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {activeTab === "archive" ? (
          archivedNotifications.length > 0 ? (
            archivedNotifications.map((notification) => (
              <div
                key={notification.id}
                className="border rounded-lg p-4 transition-all bg-card border-border/50 opacity-75"
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={getTypeColor(notification.type)}>
                          {getTypeLabel(notification.type)}
                        </Badge>
                        <Badge className="bg-muted text-muted-foreground border-border">Архив</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mt-3">
                      <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                      {notification.location && (
                        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                          📍 {notification.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <Archive size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Нет архивных уведомлений за последние 7 дней</p>
            </div>
          )
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 transition-all cursor-pointer ${
                notification.read ? "bg-card border-border/50" : "bg-card border-border bg-primary/5"
              } hover:border-primary/50`}
              onClick={() => handleNotificationClick(notification)}
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
                  </div>

                  <div
                    className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {notification.dealId && (
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        Перейти
                      </button>
                    )}
                    {notification.type === "message" && (
                      <button
                        onClick={() => router.push("/messages")}
                        className="text-xs px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        Перейти
                      </button>
                    )}
                    {notification.type === "royalty_payment" && isUkRole && (
                      <button
                        onClick={() => confirmRoyaltyPayment(notification.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-600 hover:bg-green-500/30 transition-colors font-medium border border-green-500/30"
                      >
                        <Banknote size={14} className="inline mr-1" />
                        Оплата прошла
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Удалить
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

      {/* Push Notification Settings */}
      {push.supported && (
        <div className="bg-card border border-border rounded-lg p-5 sm:p-6">
          <h3 className="font-semibold text-foreground mb-4">Настройки уведомлений</h3>
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${push.isSubscribed ? "gradient-primary" : "bg-muted"}`}>
              {push.isSubscribed ? (
                <BellRing className="h-5 w-5 text-white" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Пуш-уведомления</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {push.isSubscribed
                  ? "Уведомления включены — вы будете получать их даже когда приложение закрыто"
                  : push.permission === "denied"
                  ? "Уведомления заблокированы в браузере. Разрешите их в настройках."
                  : "Получайте уведомления о новых сообщениях и лидах"}
              </p>
            </div>
            {push.permission !== "denied" && (
              <button
                onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
                disabled={push.isLoading}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
                  push.isSubscribed
                    ? "bg-muted hover:bg-muted/80 text-muted-foreground"
                    : "gradient-primary text-white hover:opacity-90"
                }`}
              >
                {push.isLoading ? "..." : push.isSubscribed ? "Отключить" : "Включить"}
              </button>
            )}
          </div>
        </div>
      )}

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
