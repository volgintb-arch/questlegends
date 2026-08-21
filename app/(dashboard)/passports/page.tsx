"use client"

import { useState } from "react"
import { Gamepad2, Search, BarChart3, MessageSquare, Gift } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { PassportsGames } from "@/components/passports-games"
import { PassportsMetrics } from "@/components/passports-metrics"
import { PassportsSearch } from "@/components/passports-search"
import { PassportsReviews } from "@/components/passports-reviews"
import { PassportsGiftOffers } from "@/components/passports-gift-offers"

type Tab = "games" | "search" | "metrics" | "reviews" | "gift-offers"

// UK-роли города не имеют — на games/search/metrics/reviews (city-scoped) не пускаем,
// но gift-offers включает federation-wide режим — им нужен как раз он.
const UK_ROLES = ["super_admin", "uk", "uk_employee"]

const ALL_TABS: { id: Tab; label: string; icon: any; ukAllowed: boolean }[] = [
  { id: "games", label: "Игры", icon: Gamepad2, ukAllowed: false },
  { id: "search", label: "Поиск паспорта", icon: Search, ukAllowed: false },
  { id: "metrics", label: "Метрики", icon: BarChart3, ukAllowed: false },
  { id: "reviews", label: "Отзывы", icon: MessageSquare, ukAllowed: false },
  { id: "gift-offers", label: "Скидки", icon: Gift, ukAllowed: true },
]

export default function PassportsPage() {
  const { user } = useAuth()
  const isUK = user ? UK_ROLES.includes(user.role) : false
  const tabs = ALL_TABS.filter((t) => (isUK ? t.ukAllowed : true))
  const defaultTab: Tab = isUK ? "gift-offers" : "games"
  const [tab, setTab] = useState<Tab>(defaultTab)

  // Если сохранённый tab не разрешён текущей роли — откатим на дефолтный.
  const effectiveTab: Tab = tabs.some((t) => t.id === tab) ? tab : defaultTab

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 sm:px-6 pt-3">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs sm:text-sm rounded-t-lg flex items-center gap-1.5 border-b-2 transition-colors ${
                effectiveTab === t.id
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
        {effectiveTab === "games" && <PassportsGames />}
        {effectiveTab === "search" && <PassportsSearch />}
        {effectiveTab === "metrics" && <PassportsMetrics />}
        {effectiveTab === "reviews" && <PassportsReviews />}
        {effectiveTab === "gift-offers" && <PassportsGiftOffers />}
      </div>
    </div>
  )
}
