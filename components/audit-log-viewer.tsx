"use client"
import { Clock, Edit, Trash, Plus, Eye, FileText } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { AuditLog } from "@/lib/types"

interface AuditLogViewerProps {
  logs: AuditLog[]
  compact?: boolean
  maxHeight?: string
}

export function AuditLogViewer({ logs, compact = false, maxHeight = "500px" }: AuditLogViewerProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return <Plus className="w-4 h-4 text-green-500" />
      case "update":
        return <Edit className="w-4 h-4 text-blue-500" />
      case "delete":
        return <Trash className="w-4 h-4 text-red-500" />
      default:
        return <Eye className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create":
        return "Создано"
      case "update":
        return "Изменено"
      case "delete":
        return "Удалено"
      default:
        return "Просмотрено"
    }
  }

  const getEntityLabel = (entity: string) => {
    switch (entity) {
      case "deal":
        return "Сделка"
      case "transaction":
        return "Транзакция"
      case "expense":
        return "Расход"
      case "personnel":
        return "Персонал"
      case "role":
        return "Роль"
      default:
        return entity
    }
  }

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      stage: "Стадия",
      amount: "Сумма",
      status: "Статус",
      priority: "Приоритет",
      participants: "Участники",
      check_per_person: "Чек на человека",
      animators_count: "Количество аниматоров",
      animator_rate: "Ставка аниматора",
      host_rate: "Ставка ведущего",
      dj_rate: "Ставка DJ",
      category: "Категория",
      description: "Описание",
      name: "Имя",
      role: "Роль",
      phone: "Телефон",
      telegram_id: "Telegram ID",
    }
    return labels[field] || field
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "—"
    if (typeof value === "boolean") return value ? "Да" : "Нет"
    if (typeof value === "number") return value.toLocaleString("ru-RU")
    return String(value)
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">История изменений пуста</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Все изменения будут отображаться здесь</p>
      </div>
    )
  }

  return (
    <ScrollArea style={{ maxHeight }} className="pr-4">
      <div className="space-y-4">
        {logs.map((log, index) => (
          <div key={log.id}>
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">{getActionIcon(log.action)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{log.user_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {getActionLabel(log.action)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{getEntityLabel(log.entity)}</span>
                    </div>
                    {!compact && log.field && (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">{getFieldLabel(log.field)}: </span>
                        {log.old_value && (
                          <span className="line-through text-muted-foreground/70">{formatValue(log.old_value)}</span>
                        )}
                        {log.old_value && log.new_value && <span className="mx-1 text-muted-foreground">→</span>}
                        {log.new_value && <span className="font-medium">{formatValue(log.new_value)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {format(new Date(log.created_at), "dd MMM, HH:mm", { locale: ru })}
                  </div>
                </div>
              </div>
            </div>
            {index < logs.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
