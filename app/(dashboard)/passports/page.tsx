"use client"

import { useState } from "react"
import {
  Gamepad2,
  Search,
  BarChart3,
  MessageSquare,
  Gift,
  Trophy,
  Ticket,
  ClipboardCheck,
  Filter,
  MapPin,
} from "lucide-react"
import { PassportsGames } from "@/components/passports-games"
import { PassportsMetrics } from "@/components/passports-metrics"
import { PassportsSearch } from "@/components/passports-search"
import { PassportsReviews } from "@/components/passports-reviews"
import { PassportsGiftOffers } from "@/components/passports-gift-offers"
import { PassportsBonusRules } from "@/components/passports-bonus-rules"
import { PassportsBonusRedeem } from "@/components/passports-bonus-redeem"
import { PassportsActivationConfirm } from "@/components/passports-activation-confirm"
import { PassportsFunnel } from "@/components/passports-funnel"
import { PassportsVenues } from "@/components/passports-venues"

type Tab =
  | "games"
  | "search"
  | "metrics"
  | "funnel"
  | "reviews"
  | "gift-offers"
  | "bonus-rules"
  | "bonus-redeem"
  | "activation-confirm"
  | "venues"

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "games", label: "Игры", icon: Gamepad2 },
  { id: "search", label: "Поиск паспорта", icon: Search },
  { id: "metrics", label: "Метрики", icon: BarChart3 },
  { id: "funnel", label: "Воронка", icon: Filter },
  { id: "reviews", label: "Отзывы", icon: MessageSquare },
  { id: "gift-offers", label: "Скидки", icon: Gift },
  { id: "bonus-rules", label: "Правила лояльности", icon: Trophy },
  { id: "bonus-redeem", label: "Погашение", icon: Ticket },
  { id: "activation-confirm", label: "Подтверждение", icon: ClipboardCheck },
  { id: "venues", label: "Точки", icon: MapPin },
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
        {tab === "funnel" && <PassportsFunnel />}
        {tab === "reviews" && <PassportsReviews />}
        {tab === "gift-offers" && <PassportsGiftOffers />}
        {tab === "bonus-rules" && <PassportsBonusRules />}
        {tab === "bonus-redeem" && <PassportsBonusRedeem />}
        {tab === "activation-confirm" && <PassportsActivationConfirm />}
        {tab === "venues" && <PassportsVenues />}
      </div>
    </div>
  )
}
