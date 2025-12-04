"use client"

import { useState, useEffect } from "react"
import { Plus, Filter } from "lucide-react"
import { KanbanColumn } from "./kanban-column"

interface FranchiseSale {
  id: string
  title: string
  city: string
  investmentRequired: string
  contactName: string
  daysOpen: number
  priority?: "high" | "medium" | "low"
  expectedROI?: string
}

export function FranchiseSalesKanban() {
  const [filterOpen, setFilterOpen] = useState(false)
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  const franchiseSales = {
    Лиды: deals.filter((d) => d.stage === "Лиды"),
    Переговоры: deals.filter((d) => d.stage === "Переговоры"),
    Предложение: deals.filter((d) => d.stage === "Предложение"),
    Подписано: deals.filter((d) => d.stage === "Подписано"),
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
          <button className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-colors">
            <Filter size={18} />
            <span className="text-sm">Фильтр</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors">
            <Plus size={18} />
            <span className="text-sm">Новая продажа франчайзи</span>
          </button>
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
