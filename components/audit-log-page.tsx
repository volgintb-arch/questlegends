"use client"

import { useState } from "react"
import { FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuditLogViewer } from "./audit-log-viewer"
import type { AuditLog } from "@/lib/types"

// Mock data - replace with actual API call
const mockAuditLogs: AuditLog[] = [
  {
    id: "1",
    entity: "deal",
    entity_id: "D-001",
    action: "update",
    field: "stage",
    old_value: "Лиды",
    new_value: "Переговоры",
    user_id: "U-001",
    user_name: "Иван Петров",
    created_at: new Date("2025-01-15T14:30:00"),
  },
  {
    id: "2",
    entity: "transaction",
    entity_id: "T-001",
    action: "create",
    user_id: "U-002",
    user_name: "Мария Сидорова",
    created_at: new Date("2025-01-15T12:15:00"),
  },
  {
    id: "3",
    entity: "expense",
    entity_id: "E-001",
    action: "update",
    field: "status",
    old_value: "pending",
    new_value: "approved",
    user_id: "U-003",
    user_name: "Александр Козлов",
    created_at: new Date("2025-01-14T16:45:00"),
  },
  {
    id: "4",
    entity: "personnel",
    entity_id: "P-001",
    action: "update",
    field: "status",
    old_value: "active",
    new_value: "on_leave",
    user_id: "U-001",
    user_name: "Иван Петров",
    created_at: new Date("2025-01-14T10:20:00"),
  },
  {
    id: "5",
    entity: "deal",
    entity_id: "D-002",
    action: "update",
    field: "amount",
    old_value: 40000,
    new_value: 45000,
    user_id: "U-002",
    user_name: "Мария Сидорова",
    created_at: new Date("2025-01-13T15:30:00"),
  },
]

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>(mockAuditLogs)
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const filteredLogs = logs.filter((log) => {
    if (entityFilter !== "all" && log.entity !== entityFilter) return false
    if (actionFilter !== "all" && log.action !== actionFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        log.user_name.toLowerCase().includes(query) ||
        log.entity.toLowerCase().includes(query) ||
        log.entity_id.toLowerCase().includes(query)
      )
    }
    return true
  })

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Exporting audit logs...")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">История изменений</h1>
        <p className="text-sm text-muted-foreground mt-1">Полная история всех действий пользователей в системе</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Фильтры</span>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Экспорт
            </Button>
          </CardTitle>
          <CardDescription>Настройте фильтры для поиска нужных записей</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity-filter">Сущность</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger id="entity-filter">
                  <SelectValue placeholder="Все сущности" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все сущности</SelectItem>
                  <SelectItem value="deal">Сделки</SelectItem>
                  <SelectItem value="transaction">Транзакции</SelectItem>
                  <SelectItem value="expense">Расходы</SelectItem>
                  <SelectItem value="personnel">Персонал</SelectItem>
                  <SelectItem value="role">Роли</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-filter">Действие</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action-filter">
                  <SelectValue placeholder="Все действия" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все действия</SelectItem>
                  <SelectItem value="create">Создано</SelectItem>
                  <SelectItem value="update">Изменено</SelectItem>
                  <SelectItem value="delete">Удалено</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Поиск</Label>
              <Input
                id="search"
                placeholder="Имя пользователя или ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Лог изменений
          </CardTitle>
          <CardDescription>Найдено записей: {filteredLogs.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogViewer logs={filteredLogs} maxHeight="600px" />
        </CardContent>
      </Card>
    </div>
  )
}
