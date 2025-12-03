"use client"

import { useState } from "react"
import { AlertTriangle, MessageCircle, Send, Eye, Trash2 } from "lucide-react"
import { AlertDetailModal } from "./alert-detail-modal"
import { useAlerts } from "@/contexts/alerts-context"

interface AlertWithCommentsProps {
  alertId: string
  location: string
  dealId: string
  message: string
  franchisee: string
  severity: "critical" | "warning"
  onArchive?: (dealId: string) => void
}

export function AlertWithComments({
  alertId,
  location,
  dealId,
  message,
  franchisee,
  severity,
  onArchive,
}: AlertWithCommentsProps) {
  const { updateAlert, getAlert, archiveAlert: contextArchiveAlert, deleteAlert } = useAlerts()
  const alert = getAlert(alertId)
  const [showComments, setShowComments] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [newComment, setNewComment] = useState("")

  const currentComments = alert?.comments || [
    {
      id: "1",
      author: "Система",
      text: "Обнаружен критический сбой в системе франчайзи",
      timestamp: "2025-11-26 14:30",
      role: "system",
    },
  ]

  const handleAddComment = () => {
    if (newComment.trim()) {
      const updatedComments = [
        ...currentComments,
        {
          id: String(currentComments.length + 1),
          author: "УК Администратор",
          text: newComment,
          timestamp: new Date().toLocaleString("ru-RU"),
          role: "uk",
        },
      ]
      updateAlert(alertId, { comments: updatedComments })
      setNewComment("")
    }
  }

  const generateAnalysis = () => {
    const analysisComment = {
      id: String(currentComments.length + 1),
      author: "AI Аналитик",
      text: `Анализ: ${message}. Рекомендация: Немедленно связаться с франчайзи ${franchisee} для устранения проблемы. Возможные причины: системная ошибка или нарушение процесса. Действие: отправить уведомление и предоставить техническую поддержку.`,
      timestamp: new Date().toLocaleString("ru-RU"),
      role: "ai",
    }
    updateAlert(alertId, { comments: [...currentComments, analysisComment] })
  }

  const handleArchive = () => {
    if (currentComments.length > 1) {
      contextArchiveAlert(alertId)
      onArchive?.(dealId)
    }
  }

  const handleDelete = () => {
    if (confirm("Вы уверены, что хотите удалить этот сбой?")) {
      deleteAlert(alertId)
    }
  }

  if (alert?.archived) {
    return null
  }

  return (
    <>
      <div
        className={`rounded-lg border p-4 backdrop-blur-sm transition-all ${
          severity === "critical" ? "bg-destructive/10 border-destructive/50" : "bg-yellow-500/10 border-yellow-500/50"
        }`}
      >
        <div className="space-y-4">
          {/* Alert Header */}
          <div className="flex gap-3 items-start">
            <AlertTriangle
              className={`w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse ${
                severity === "critical" ? "text-destructive" : "text-yellow-500"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3
                    className={`font-semibold text-sm ${severity === "critical" ? "text-destructive" : "text-yellow-600"}`}
                  >
                    {severity === "critical" ? "СБОЙ!" : "ПРЕДУПРЕЖДЕНИЕ"}
                  </h3>
                  <p
                    className={`text-sm mt-1 ${severity === "critical" ? "text-destructive-foreground/90" : "text-yellow-600/90"}`}
                  >
                    <span className="font-medium">[{location}]</span> {message}
                  </p>
                  <div className="flex gap-4 mt-2 flex-wrap">
                    <p
                      className={`text-xs ${severity === "critical" ? "text-destructive-foreground/70" : "text-yellow-600/70"}`}
                    >
                      ID: <span className="font-mono">{dealId}</span>
                    </p>
                    <p
                      className={`text-xs ${severity === "critical" ? "text-destructive-foreground/70" : "text-yellow-600/70"}`}
                    >
                      Франчайзи: <span className="font-medium">{franchisee}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowDetailModal(true)}
                    className="p-2 rounded hover:bg-muted transition-colors"
                    title="Просмотреть подробно"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      showComments ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <MessageCircle size={14} />
                    <span>{currentComments.length}</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    title="Удалить сбой"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="space-y-3 border-t border-border pt-4">
              {/* Comments List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentComments.map((comment) => (
                  <div key={comment.id} className="bg-muted/30 rounded p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{comment.author}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            comment.role === "system"
                              ? "bg-blue-500/20 text-blue-600"
                              : comment.role === "ai"
                                ? "bg-purple-500/20 text-purple-600"
                                : "bg-green-500/20 text-green-600"
                          }`}
                        >
                          {comment.role === "system" ? "Система" : comment.role === "ai" ? "AI" : "УК"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{comment.text}</p>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={generateAnalysis}
                  className="flex-1 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-600 text-xs font-medium rounded transition-colors"
                >
                  Анализ AI
                </button>
                <button className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 text-xs font-medium rounded transition-colors">
                  Отправить франчайзи
                </button>
              </div>

              {/* Comment Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Добавить комментарий..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                  className="flex-1 bg-card border border-border rounded px-3 py-2 text-xs outline-none focus:border-primary"
                />
                <button
                  onClick={handleAddComment}
                  className="px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>

              {/* Archive Button */}
              {currentComments.length > 1 && (
                <button
                  onClick={handleArchive}
                  className="w-full px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-600 text-xs font-medium rounded transition-colors"
                >
                  Архивировать сбой
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AlertDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        alert={alert}
        onAddComment={(comment) => {
          const updatedComments = [
            ...currentComments,
            {
              id: String(currentComments.length + 1),
              author: "УК Администратор",
              text: comment,
              timestamp: new Date().toLocaleString("ru-RU"),
              role: "uk",
            },
          ]
          updateAlert(alertId, { comments: updatedComments })
        }}
      />
    </>
  )
}
