"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Loader2,
  Play,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface CallRecord {
  id: string
  callId: string | null
  direction: string
  callerNumber: string
  calledNumber: string
  sipNumber: string | null
  status: string
  duration: number
  recordUrl: string | null
  answeredByName: string | null
  linkedLeadId: string | null
  linkedLeadType: string | null
  startedAt: string
  endedAt: string | null
}

export function CallLog() {
  const { getAuthHeaders } = useAuth()
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  const fetchCalls = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
      if (search) params.set("search", search)

      const res = await fetch(`/api/sipuni/calls?${params}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setCalls(data.calls || [])
        setTotal(data.total || 0)
      }
    } catch {
      toast({ title: "Ошибка загрузки звонков", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders, page, search])

  useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "—"
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}м ${s}с` : `${s}с`
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  }

  const getCallIcon = (direction: string, status: string) => {
    if (status === "missed" || status === "no-answer") {
      return <PhoneMissed className="w-4 h-4 text-red-500" />
    }
    if (direction === "inbound") {
      return <PhoneIncoming className="w-4 h-4 text-green-500" />
    }
    return <PhoneOutgoing className="w-4 h-4 text-blue-500" />
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      answered: { label: "Отвечен", variant: "default" },
      missed: { label: "Пропущен", variant: "destructive" },
      "no-answer": { label: "Нет ответа", variant: "destructive" },
      busy: { label: "Занято", variant: "secondary" },
      completed: { label: "Завершён", variant: "default" },
    }
    const info = map[status] || { label: status, variant: "secondary" as const }
    return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Поиск по номеру..."
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{total} звонков</Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : calls.length === 0 ? (
        <Card className="glass-card p-8 text-center">
          <PhoneIncoming className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Нет звонков</p>
          <p className="text-xs text-muted-foreground mt-1">Звонки появятся после настройки webhook в Sipuni</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <Card key={call.id} className="glass-card p-3 flex items-center gap-3">
              <div className="flex-shrink-0">
                {getCallIcon(call.direction, call.status)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {call.direction === "inbound" ? call.callerNumber : call.calledNumber}
                  </span>
                  {getStatusBadge(call.status)}
                  {call.linkedLeadId && (
                    <Badge variant="outline" className="text-[10px]">
                      {call.linkedLeadType === "b2c" ? "B2C" : "B2B"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(call.startedAt)} {formatTime(call.startedAt)}
                  </span>
                  <span>{formatDuration(call.duration)}</span>
                  {call.answeredByName && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {call.answeredByName}
                    </span>
                  )}
                  {call.direction === "inbound" && (
                    <span className="text-muted-foreground/60">
                      → {call.calledNumber}
                    </span>
                  )}
                </div>
              </div>

              {call.recordUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(call.recordUrl!, "_blank")}
                  title="Прослушать запись"
                >
                  <Play className="w-4 h-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
