"use client"

import { AlertTriangle, X, Send } from "lucide-react"
import { useState } from "react"

interface AlertDetailModalProps {
  isOpen: boolean
  onClose: () => void
  alert?: {
    id: string
    location: string
    dealId: string
    message: string
    franchisee: string
    severity: "critical" | "warning"
    comments: Array<{
      id: string
      author: string
      text: string
      timestamp: string
      role: string
    }>
  }
  onAddComment?: (comment: string) => void
}

export function AlertDetailModal({ isOpen, onClose, alert, onAddComment }: AlertDetailModalProps) {
  const [newComment, setNewComment] = useState("")

  if (!isOpen || !alert) return null

  const handleAddComment = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment)
      setNewComment("")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`w-6 h-6 flex-shrink-0 mt-1 ${
                alert.severity === "critical" ? "text-destructive" : "text-yellow-500"
              }`}
            />
            <div>
              <h2 className="text-xl font-bold text-foreground">{alert.message}</h2>
              <p className="text-sm text-muted-foreground mt-1">ID: {alert.dealId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Alert Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Локация</p>
              <p className="font-semibold text-foreground">{alert.location}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Франчайзи</p>
              <p className="font-semibold text-foreground">{alert.franchisee}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ID Сделки</p>
              <p className="font-mono text-foreground">{alert.dealId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Серьезность</p>
              <span
                className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                  alert.severity === "critical"
                    ? "bg-destructive/20 text-destructive"
                    : "bg-yellow-500/20 text-yellow-600"
                }`}
              >
                {alert.severity === "critical" ? "Критичный" : "Предупреждение"}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Комментарии и История</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {alert.comments.map((comment) => (
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
                  <p className="text-xs text-foreground/80">{comment.text}</p>
                </div>
              ))}
            </div>

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
    </div>
  )
}
