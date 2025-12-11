"use client"

import { useState, useEffect } from "react"
import { Plus, Filter, Search, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KanbanColumn } from "./kanban-column"

interface FranchiseSale {
  id: string
  title: string
  city: string
  investmentRequired: string
  contactName: string
  daysOpen: number
  stage: string
  priority?: "high" | "medium" | "low"
  expectedROI?: string
}

export function FranchiseSalesKanban() {
  const [filterOpen, setFilterOpen] = useState(false)
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    city: "",
    investmentFrom: "",
    investmentTo: "",
    priority: "",
  })
  const [sortBy, setSortBy] = useState<"date" | "investment" | "name">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    fetchB2BDeals()
  }, [])

  const fetchB2BDeals = async () => {
    try {
      const response = await fetch("/api/b2b-deals")
      if (response.ok) {
        const data = await response.json()
        setDeals(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching B2B deals:", error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredAndSortedDeals = () => {
    let filtered = [...deals]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (deal) =>
          deal.title?.toLowerCase().includes(term) ||
          deal.contactName?.toLowerCase().includes(term) ||
          deal.city?.toLowerCase().includes(term),
      )
    }

    // City filter
    if (filters.city) {
      filtered = filtered.filter((deal) => deal.city?.toLowerCase().includes(filters.city.toLowerCase()))
    }

    // Investment filter
    if (filters.investmentFrom) {
      filtered = filtered.filter((deal) => {
        const investment = Number.parseFloat(deal.investmentRequired?.replace(/[^\d]/g, "") || "0")
        return investment >= Number.parseFloat(filters.investmentFrom)
      })
    }
    if (filters.investmentTo) {
      filtered = filtered.filter((deal) => {
        const investment = Number.parseFloat(deal.investmentRequired?.replace(/[^\d]/g, "") || "0")
        return investment <= Number.parseFloat(filters.investmentTo)
      })
    }

    // Priority filter
    if (filters.priority) {
      filtered = filtered.filter((deal) => deal.priority === filters.priority)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      if (sortBy === "date") {
        comparison = a.daysOpen - b.daysOpen
      } else if (sortBy === "investment") {
        const aInv = Number.parseFloat(a.investmentRequired?.replace(/[^\d]/g, "") || "0")
        const bInv = Number.parseFloat(b.investmentRequired?.replace(/[^\d]/g, "") || "0")
        comparison = aInv - bInv
      } else if (sortBy === "name") {
        comparison = a.contactName?.localeCompare(b.contactName || "") || 0
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }

  const filteredDeals = getFilteredAndSortedDeals()

  const handleClearFilters = () => {
    setSearchTerm("")
    setFilters({
      city: "",
      investmentFrom: "",
      investmentTo: "",
      priority: "",
    })
  }

  const franchiseSales = {
    Лиды: filteredDeals.filter((d) => d.stage === "Лиды"),
    Переговоры: filteredDeals.filter((d) => d.stage === "Переговоры"),
    Предложение: filteredDeals.filter((d) => d.stage === "Предложение"),
    Подписано: filteredDeals.filter((d) => d.stage === "Подписано"),
  }

  const totalDeals = deals.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка сделок...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Продажа Франчиз</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление продажей франшиз и привлечением новых партнеров
          </p>
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors">
            <Plus size={18} />
            <span className="text-sm">Новая продажа франчайзи</span>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, городу или контактному лицу..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Фильтры
            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </Button>
          {(searchTerm || Object.values(filters).some((v) => v)) && (
            <Button variant="ghost" size="icon" onClick={handleClearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium">Город</label>
              <Input
                placeholder="Все города"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Инвестиции от (₽)</label>
              <Input
                type="number"
                placeholder="0"
                value={filters.investmentFrom}
                onChange={(e) => setFilters({ ...filters, investmentFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Инвестиции до (₽)</label>
              <Input
                type="number"
                placeholder="Без ограничений"
                value={filters.investmentTo}
                onChange={(e) => setFilters({ ...filters, investmentTo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Приоритет</label>
              <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Все приоритеты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="low">Низкий</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Сортировка</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="По дате" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">По дате</SelectItem>
                  <SelectItem value="investment">По инвестициям</SelectItem>
                  <SelectItem value="name">По имени</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Порядок</label>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="По убыванию" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">По возрастанию</SelectItem>
                  <SelectItem value="desc">По убыванию</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Найдено сделок: {filteredDeals.length} из {totalDeals}
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {Object.entries(franchiseSales).map(([stage, deals]) => (
            <KanbanColumn key={stage} stage={stage} deals={deals as any} dealCount={deals.length} />
          ))}
        </div>
      </div>

      {/* Stats Footer - simplified for UK B2B CRM */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Всего лидов</p>
          <p className="text-2xl font-bold text-foreground">{franchiseSales.Лиды.length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">В переговорах</p>
          <p className="text-2xl font-bold text-accent">{franchiseSales.Переговоры.length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Готовых предложений</p>
          <p className="text-2xl font-bold text-primary">{franchiseSales.Предложение.length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Подписано контрактов</p>
          <p className="text-2xl font-bold text-green-500">{franchiseSales.Подписано.length}</p>
        </div>
      </div>
    </div>
  )
}
