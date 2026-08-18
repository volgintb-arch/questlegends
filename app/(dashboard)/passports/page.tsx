"use client"

import { useState } from "react"
import { Gamepad2, Search, BarChart3, MessageSquare } from "lucide-react"
import { PassportsGames } from "@/components/passports-games"
import { PassportsMetrics } from "@/components/passports-metrics"
import { PassportsSearch } from "@/components/passports-search"
import { PassportsReviews } from "@/components/passports-reviews"

type Tab = "games" | "search" | "metrics" | "reviews"

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "games", label: "Игры", icon: Gamepad2 },
  { id: "search", label: "Поиск паспорта", icon: Search },
  { id: "metrics", label: "Метрики", icon: BarChart3 },
  { id: "reviews", label: "Отзывы", icon: MessageSquare },
]

export default function PassportsPage() {
  const [tab, setTab] = useState<Tab>("games")

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
        {tab === "games" && <PassportsGames />}
        {tab === "search" && <PassportsSearch />}
        {tab === "metrics" && <PassportsMetrics />}
        {tab === "reviews" && <PassportsReviews />}
      </div>
    </div>
  )
}
