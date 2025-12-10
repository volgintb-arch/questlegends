"use client"

import { useState, useEffect } from "react"
import { ArrowRight, Trash2, Edit3, Plus, Users, CheckCircle, Calendar, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface GameLog {
  id: string
  leadId: string
  action: string
  fromStageName?: string
  toStageName?: string
  details?: string
  userName?: string
  createdAt: string
}

interface GameLogsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GameLogsModal({ isOpen, onClose }: GameLogsModalProps) {
  const { getAuthHeaders, user } = useAuth()
  const [logs, setLogs] = useState<GameLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchLogs()
    }
  }, [isOpen])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (user?.franchiseeId) {
        params.append("franchiseeId", user.franchiseeId)
      }

      const res = await fetch(`/api/game-leads/logs?${params.toString()}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })

      if (res.ok) {
        const data = await res.json()
        setLogs(data.data || [])
      } else {
        setError(`Ошибка загрузки: ${res.status}`)
      }
    } catch (err) {
      console.error("Error fetching game logs:", err)
      setError("Ошибка загрузки логов")
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "move":
        return <ArrowRight className="h-4 w-4 text-blue-500" />
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-500" />
      case "edit":
        return <Edit3 className="h-4 w-4 text-yellow-500" />
      case "create":
        return <Plus className="h-4 w-4 text-green-500" />
      case "staff_assign":
        return <Users className="h-4 w-4 text-purple-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "schedule":
        return <Calendar className="h-4 w-4 text-orange-500" />
      default:
        return <Edit3 className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getActionText = (log: GameLog) => {
    switch (log.action) {
      case "move":
        return `Перемещение: ${log.fromStageName || "?"} → ${log.toStageName || "?"}`
      case "delete":
        return log.details || "Удаление заявки"
      case "edit":
        return log.details || "Изменение данных заявки"
      case "create":
        return log.details || "Создание заявки"
      case "staff_assign":
        return `Назначение персонала: ${log.details}`
      case "completed":
        return log.details || "Игра завершена"
      case "schedule":
        return log.details || "Игра добавлена в график"
      default:
        return log.details || log.action
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg">Логи CRM Игры</DialogTitle>
          <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Загрузка...</div>
          ) : error ? (
            <div className="text-center py-8 text-sm text-red-500">{error}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Нет записей в логах</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded border bg-muted/30">
                  <div className="mt-0.5">{getActionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{getActionText(log)}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{log.userName || "Система"}</span>
                      <span>•</span>
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
