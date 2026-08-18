"use client"

import { useState } from "react"
import { Gamepad2, Search, BarChart3, MessageSquare } from "lucide-react"
import { PassportsTab } from "@/components/passports-tab"
import { PassportsGames } from "@/components/passports-games"

type Tab = "games" | "search" | "metrics" | "reviews"

const TABS: { id: Tab; label: string; icon: any; path: string; description: string }[] = [
  {
    id: "games",
    label: "Игры",
    icon: Gamepad2,
    path: "games",
    description:
      "Список сыгранных игр из seeker'ской админки — активации по QR-монетам, загрузка ссылки на рилс, статус подтверждения гостями.",
  },
  {
    id: "search",
    label: "Поиск паспорта",
    icon: Search,
    path: "passports",
    description:
      "Поиск паспорта искателя по номеру, имени ребёнка или телефону родителя. Отдаёт данные из seeker'ской БД.",
  },
  {
    id: "metrics",
    label: "Метрики",
    icon: BarChart3,
    path: "metrics",
    description:
      "activation_rate по площадкам и администраторам, статистика по игре/родителю/ребёнку — прямо из seeker'а.",
  },
  {
    id: "reviews",
    label: "Отзывы",
    icon: MessageSquare,
    path: "reviews",
    description:
      "Отзывы родителей, оставленные через паспорт искателя после игры.",
  },
]

export default function PassportsPage() {
  const [tab, setTab] = useState<Tab>("games")
  const activeTab = TABS.find((t) => t.id === tab)!

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 sm:px-6 pt-3">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs sm:text-sm rounded-t-lg flex items-center gap-1.5 border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "games" ? <PassportsGames /> : <PassportsTab tab={activeTab} />}
      </div>
    </div>
  )
}
