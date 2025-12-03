"use client"

import { X, Send } from "lucide-react"
import { useState } from "react"

interface NotificationDetailModalProps {
  isOpen: boolean
  onClose: () => void
  notification?: {
    id: string
    type: "critical" | "warning" | "info" | "success"
    title: string
    message: string
    timestamp: string
    read: boolean
    location?: string
    dealId?: string
    comments: string[]
  }
  onAddComment?: (comment: string) => void
}

export function NotificationDetailModal({ isOpen, onClose, notification, onAddComment }: NotificationDetailModalProps) {
  const [newComment, setNewComment] = useState("")

  if (!isOpen || !notification) return null

  const handleAddComment = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment)
      setNewComment("")
    }
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      critical: "🔴",
      warning: "🟠",
      success: "🟢",
      info: "🔵",
    }
    return icons[type] || "ℹ️"
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      critical: "Критичное",
      warning: "Предупреждение",
      success: "Успех",
      info: "Информация",
    }
    return labels[type] || "Информация"
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{getTypeIcon(notification.type)}</span>
            <div>
              <h2 className="text-xl font-bold text-foreground">{notification.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{notification.timestamp}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Notification Details */}
          <div>
            <p className="text-sm text-foreground leading-relaxed">{notification.message}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Тип</p>
              <p className="font-semibold text-foreground">{getTypeLabel(notification.type)}</p>
            </div>
            {notification.location && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Локация</p>
                <p className="font-semibold text-foreground">{notification.location}</p>
              </div>
            )}
            {notification.dealId && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ID Сделки</p>
                <p className="font-mono text-foreground text-sm">{notification.dealId}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Статус</p>
              <p className="font-semibold text-foreground">{notification.read ? "Прочитано" : "Новое"}</p>
            </div>
          </div>

          {/* Comments */}
          {notification.comments.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Комментарии</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notification.comments.map((comment, idx) => (
                  <div key={idx} className="bg-muted/30 rounded p-3">
                    <p className="text-xs text-foreground/80">{comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comment Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Добавить комментарий..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
              className="flex-1 bg-muted/20 border border-border rounded px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <button
              onClick={handleAddComment}
              className="px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
