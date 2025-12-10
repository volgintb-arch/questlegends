"use client"

import { useState, useEffect } from "react"
import { X, Search, MoveRight, Trash2, Edit, Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface DealLog {
  id: string
  dealId: string
  action: string
  fromStageName?: string
  toStageName?: string
  pipelineName?: string
  details?: string
  userName?: string
  createdAt: string
}

interface CrmLogsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CrmLogsModal({ isOpen, onClose }: CrmLogsModalProps) {
  const [logs, setLogs] = useState<DealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const { getAuthHeaders } = useAuth()

  useEffect(() => {
    if (isOpen) {
      fetchLogs()
    }
  }, [isOpen])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/crm/logs", {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "move":
        return <MoveRight className="h-4 w-4 text-blue-500" />
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-500" />
      case "update":
        return <Edit className="h-4 w-4 text-yellow-500" />
      case "create":
        return <Plus className="h-4 w-4 text-green-500" />
      default:
        return <Edit className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case "move":
        return "Перемещение"
      case "delete":
        return "Удаление"
      case "update":
        return "Изменение"
      case "create":
        return "Создание"
      default:
        return action
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterAction === "all" || log.action === filterAction
    return matchesSearch && matchesFilter
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Логи CRM</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по логам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm"
          >
            <option value="all">Все действия</option>
            <option value="create">Создание</option>
            <option value="move">Перемещение</option>
            <option value="update">Изменение</option>
            <option value="delete">Удаление</option>
          </select>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-140px)]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Нет записей</div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getActionIcon(log.action)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted">
                          {getActionLabel(log.action)}
                        </span>
                        {log.pipelineName && (
                          <span className="text-xs text-muted-foreground">в воронке "{log.pipelineName}"</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{log.details}</p>
                      {log.action === "move" && log.fromStageName && log.toStageName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.fromStageName} → {log.toStageName}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{log.userName || "Система"}</span>
                        <span>{new Date(log.createdAt).toLocaleString("ru-RU")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
