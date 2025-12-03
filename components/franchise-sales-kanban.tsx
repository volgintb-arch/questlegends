"use client"

import { useState } from "react"
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

  const franchiseSales = {
    Лиды: [
      {
        id: "FS-001",
        title: "Коммерческое помещение 50м²",
        city: "Москва-Юг",
        investmentRequired: "2,500,000 ₽",
        contactName: "Иван П.",
        daysOpen: 5,
        priority: "high" as const,
        expectedROI: "18 месяцев",
      },
      {
        id: "FS-002",
        title: 'Торговый центр "Взлет"',
        city: "Екатеринбург",
        investmentRequired: "1,800,000 ₽",
        contactName: "Сергей К.",
        daysOpen: 12,
        expectedROI: "22 месяца",
      },
    ],
    Переговоры: [
      {
        id: "FS-003",
        title: 'Офис в БЦ "Энергия"',
        city: "Санкт-Петербург",
        investmentRequired: "2,200,000 ₽",
        contactName: "Мария В.",
        daysOpen: 8,
        expectedROI: "20 месяцев",
      },
      {
        id: "FS-004",
        title: "Премиум локация центр",
        city: "Казань",
        investmentRequired: "3,100,000 ₽",
        contactName: "Александр Л.",
        daysOpen: 3,
        priority: "high" as const,
        expectedROI: "16 месяцев",
      },
      {
        id: "FS-005",
        title: "Новый микрорайон",
        city: "Новосибирск",
        investmentRequired: "1,950,000 ₽",
        contactName: "Дмитрий Н.",
        daysOpen: 15,
        expectedROI: "24 месяца",
      },
    ],
    Предложение: [
      {
        id: "FS-006",
        title: 'ТЦ "Квадрат" 60м²',
        city: "Тверь",
        investmentRequired: "1,500,000 ₽",
        contactName: "Ольга С.",
        daysOpen: 2,
        priority: "high" as const,
        expectedROI: "19 месяцев",
      },
      {
        id: "FS-007",
        title: "Пустой магазин на главной",
        city: "Нижний Новгород",
        investmentRequired: "2,100,000 ₽",
        contactName: "Павел Т.",
        daysOpen: 6,
        expectedROI: "21 месяц",
      },
    ],
    Подписано: [
      {
        id: "FS-008",
        title: "Договор франчайзи Ростов",
        city: "Ростов-на-Дону",
        investmentRequired: "2,400,000 ₽",
        contactName: "Юлия Р.",
        daysOpen: 20,
        expectedROI: "17 месяцев",
      },
      {
        id: "FS-009",
        title: "Договор франчайзи Волга",
        city: "Саратов",
        investmentRequired: "2,700,000 ₽",
        contactName: "Вадим М.",
        daysOpen: 1,
        priority: "high" as const,
        expectedROI: "19 месяцев",
      },
    ],
  }

  const totalDeals = Object.values(franchiseSales).flat().length

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
