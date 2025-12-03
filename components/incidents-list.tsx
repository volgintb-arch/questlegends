"use client"

import { useState } from "react"
import { AlertTriangle, Plus, Filter, Search, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useIncidents } from "@/hooks/use-incidents"
import type { Incident } from "@/lib/types"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

interface IncidentsListProps {
  locationId?: string
  onCreateIncident: () => void
  onViewIncident: (incident: Incident) => void
}

export function IncidentsList({ locationId, onCreateIncident, onViewIncident }: IncidentsListProps) {
  const [filters, setFilters] = useState({
    severity: "all",
    status: "all",
    search: "",
  })

  const { data: incidentsData, isLoading } = useIncidents({
    locationId,
    severity: filters.severity === "all" ? undefined : filters.severity,
    status: filters.status === "all" ? undefined : filters.status,
  })

  const incidents = incidentsData?.data || []

  const filteredIncidents = incidents.filter((incident) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return (
        incident.title.toLowerCase().includes(searchLower) ||
        incident.description.toLowerCase().includes(searchLower) ||
        incident.client_name?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: "bg-blue-100 text-blue-800 border-blue-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      critical: "bg-red-100 text-red-800 border-red-200",
    }
    return colors[severity as keyof typeof colors] || colors.low
  }

  const getStatusColor = (status: string) => {
    const colors = {
      open: "bg-red-100 text-red-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-800",
    }
    return colors[status as keyof typeof colors] || colors.open
  }

  const getSeverityLabel = (severity: string) => {
    const labels = {
      low: "Низкая",
      medium: "Средняя",
      high: "Высокая",
      critical: "Критическая",
    }
    return labels[severity as keyof typeof labels]
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      open: "Открыт",
      in_progress: "В работе",
      resolved: "Решен",
      closed: "Закрыт",
    }
    return labels[status as keyof typeof labels]
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold">Инциденты и Жалобы</h1>
            <p className="text-sm text-muted-foreground">Управление нарушениями и обратной связью</p>
          </div>
        </div>
        <Button onClick={onCreateIncident}>
          <Plus className="w-4 h-4 mr-2" />
          Создать инцидент
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              className="pl-9"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <Select value={filters.severity} onValueChange={(value) => setFilters({ ...filters, severity: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Серьезность" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="low">Низкая</SelectItem>
              <SelectItem value="medium">Средняя</SelectItem>
              <SelectItem value="high">Высокая</SelectItem>
              <SelectItem value="critical">Критическая</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="open">Открыт</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="resolved">Решен</SelectItem>
              <SelectItem value="closed">Закрыт</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setFilters({ severity: "all", status: "all", search: "" })}>
            <Filter className="w-4 h-4 mr-2" />
            Сбросить
          </Button>
        </div>
      </Card>

      {/* Incidents Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : filteredIncidents.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Инциденты не найдены</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIncidents.map((incident) => (
            <Card
              key={incident.id}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onViewIncident(incident)}
            >
              <div className="flex items-start justify-between mb-3">
                <Badge className={getSeverityColor(incident.severity)}>{getSeverityLabel(incident.severity)}</Badge>
                <Badge className={getStatusColor(incident.status)}>{getStatusLabel(incident.status)}</Badge>
              </div>

              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{incident.title}</h3>

              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{incident.description}</p>

              {incident.client_name && (
                <div className="text-sm mb-2">
                  <span className="font-medium">Клиент:</span> {incident.client_name}
                </div>
              )}

              {incident.photos && incident.photos.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {incident.photos.slice(0, 3).map((photo, index) => (
                    <div
                      key={index}
                      className="w-16 h-16 rounded bg-muted bg-cover bg-center"
                      style={{ backgroundImage: `url(${photo})` }}
                    />
                  ))}
                  {incident.photos.length > 3 && (
                    <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-xs font-medium">
                      +{incident.photos.length - 3}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                <span>{format(new Date(incident.created_at), "d MMM yyyy", { locale: ru })}</span>
                <Button size="sm" variant="ghost">
                  <Eye className="w-3 h-3 mr-1" />
                  Подробнее
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
