"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Plus, Target, TrendingUp, Trash2, Calendar } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

interface Kpi {
  id: string
  franchiseeId: string
  franchiseeName?: string
  franchiseeCity?: string
  name: string
  target: number
  actual: number
  period: string
  startDate: string
  endDate: string
}

interface Franchisee {
  id: string
  name: string
  city: string
}

export function KpiManagement() {
  const { user, getAuthHeaders } = useAuth()
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [franchisees, setFranchisees] = useState<Franchisee[]>([])
  const [selectedFranchisee, setSelectedFranchisee] = useState<string>("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState({
    startDate: format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"),
    endDate: format(new Date(new Date().getFullYear(), 11, 31), "yyyy-MM-dd"),
  })

  const [newKpi, setNewKpi] = useState({
    franchiseeId: "",
    name: "",
    target: "",
    period: "month",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"),
  })

  useEffect(() => {
    fetchFranchisees()
    fetchKpis()
  }, [selectedFranchisee, dateFilter])

  const fetchFranchisees = async () => {
    try {
      const response = await fetch("/api/franchisees", {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setFranchisees(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching franchisees:", error)
    }
  }

  const fetchKpis = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedFranchisee !== "all") {
        params.append("franchiseeId", selectedFranchisee)
      }
      params.append("startDate", dateFilter.startDate)
      params.append("endDate", dateFilter.endDate)

      const response = await fetch(`/api/kpi?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setKpis(data.data || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching KPIs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateKpi = async () => {
    if (!newKpi.franchiseeId || !newKpi.name || !newKpi.target) {
      alert("Заполните все обязательные поля")
      return
    }

    try {
      const response = await fetch("/api/kpi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...newKpi,
          target: Number.parseFloat(newKpi.target),
        }),
      })

      if (response.ok) {
        setIsCreateOpen(false)
        setNewKpi({
          franchiseeId: "",
          name: "",
          target: "",
          period: "month",
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"),
        })
        fetchKpis()
      }
    } catch (error) {
      console.error("[v0] Error creating KPI:", error)
    }
  }

  const handleDeleteKpi = async (id: string) => {
    if (!confirm("Удалить этот KPI?")) return

    try {
      const response = await fetch(`/api/kpi?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        fetchKpis()
      }
    } catch (error) {
      console.error("[v0] Error deleting KPI:", error)
    }
  }

  const getProgress = (actual: number, target: number) => {
    if (target === 0) return 0
    return Math.min(100, (actual / target) * 100)
  }

  const canManage = user?.role === "super_admin" || user?.role === "uk"

  // Group KPIs by franchisee
  const groupedKpis = kpis.reduce(
    (acc, kpi) => {
      const key = kpi.franchiseeId
      if (!acc[key]) {
        acc[key] = {
          franchiseeId: kpi.franchiseeId,
          franchiseeName: kpi.franchiseeName || "Неизвестно",
          franchiseeCity: kpi.franchiseeCity || "",
          kpis: [],
        }
      }
      acc[key].kpis.push(kpi)
      return acc
    },
    {} as Record<string, { franchiseeId: string; franchiseeName: string; franchiseeCity: string; kpis: Kpi[] }>,
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">KPI Франчайзи</h1>
          <p className="text-xs text-muted-foreground">Назначение и отслеживание показателей</p>
        </div>
        {canManage && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Добавить KPI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm">Новый KPI</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Франчайзи</Label>
                  <Select value={newKpi.franchiseeId} onValueChange={(v) => setNewKpi({ ...newKpi, franchiseeId: v })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Выберите франчайзи" />
                    </SelectTrigger>
                    <SelectContent>
                      {franchisees.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          {f.name} ({f.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Название KPI</Label>
                  <Input
                    value={newKpi.name}
                    onChange={(e) => setNewKpi({ ...newKpi, name: e.target.value })}
                    placeholder="Например: Выручка"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Целевое значение</Label>
                  <Input
                    type="number"
                    value={newKpi.target}
                    onChange={(e) => setNewKpi({ ...newKpi, target: e.target.value })}
                    placeholder="1000000"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Период</Label>
                  <Select value={newKpi.period} onValueChange={(v) => setNewKpi({ ...newKpi, period: v })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month" className="text-xs">
                        Месяц
                      </SelectItem>
                      <SelectItem value="quarter" className="text-xs">
                        Квартал
                      </SelectItem>
                      <SelectItem value="year" className="text-xs">
                        Год
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Начало</Label>
                    <Input
                      type="date"
                      value={newKpi.startDate}
                      onChange={(e) => setNewKpi({ ...newKpi, startDate: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Конец</Label>
                    <Input
                      type="date"
                      value={newKpi.endDate}
                      onChange={(e) => setNewKpi({ ...newKpi, endDate: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <Button onClick={handleCreateKpi} className="w-full h-8 text-xs">
                  Создать KPI
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={selectedFranchisee} onValueChange={setSelectedFranchisee}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Все франчайзи" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              Все франчайзи
            </SelectItem>
            {franchisees.map((f) => (
              <SelectItem key={f.id} value={f.id} className="text-xs">
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Calendar size={14} className="text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter.startDate}
            onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
            className="h-8 w-32 text-xs"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            value={dateFilter.endDate}
            onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
            className="h-8 w-32 text-xs"
          />
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="text-center py-8 text-xs text-muted-foreground">Загрузка...</div>
      ) : Object.keys(groupedKpis).length === 0 ? (
        <Card className="p-6 text-center">
          <Target size={32} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Нет KPI</p>
          <p className="text-xs text-muted-foreground">Назначьте KPI для франчайзи</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.values(groupedKpis).map((group) => (
            <Card key={group.franchiseeId} className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="text-sm font-semibold">{group.franchiseeName}</h3>
                <span className="text-xs text-muted-foreground">{group.franchiseeCity}</span>
              </div>

              <div className="space-y-2">
                {group.kpis.map((kpi) => {
                  const progress = getProgress(kpi.actual, kpi.target)
                  return (
                    <div key={kpi.id} className="p-2 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{kpi.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(kpi.startDate), "dd.MM", { locale: ru })} -{" "}
                            {format(new Date(kpi.endDate), "dd.MM.yy", { locale: ru })}
                          </span>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleDeleteKpi(kpi.id)}
                            >
                              <Trash2 size={12} className="text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <Progress value={progress} className="h-2 mb-1" />
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">
                          Факт: {kpi.actual.toLocaleString()} / {kpi.target.toLocaleString()}
                        </span>
                        <span
                          className={
                            progress >= 100 ? "text-green-500" : progress >= 70 ? "text-yellow-500" : "text-red-500"
                          }
                        >
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
