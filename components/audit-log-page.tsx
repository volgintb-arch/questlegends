"use client"

import { useState, useEffect } from "react"
import { FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuditLogViewer } from "./audit-log-viewer"
import type { AuditLog } from "@/lib/types"

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/audit-logs")
        if (response.ok) {
          const data = await response.json()
          setLogs(data)
        }
      } catch (error) {
        console.error("Failed to fetch audit logs:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

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
    console.log("Exporting audit logs...")
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>
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
          <CardDescription>
            {logs.length === 0 ? "Записей пока нет" : `Найдено записей: ${filteredLogs.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Записей истории изменений пока нет</p>
            </div>
          ) : (
            <AuditLogViewer logs={filteredLogs} maxHeight="600px" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
