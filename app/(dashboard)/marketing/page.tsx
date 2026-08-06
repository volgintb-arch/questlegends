"use client"

import { useState } from "react"
import { MarketingLeadsReport } from "@/components/marketing-leads-report"
import { MarketingAdsReport } from "@/components/marketing-ads-report"
import { MarketingGuests } from "@/components/marketing-guests"
import { BarChart3, Megaphone, Users } from "lucide-react"

export default function MarketingPage() {
  const [tab, setTab] = useState<"summary" | "ads" | "guests">("summary")

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 sm:px-6 pt-3">
        <div className="flex gap-1">
          <button
            onClick={() => setTab("summary")}
            className={`px-3 py-2 text-xs sm:text-sm rounded-t-lg flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === "summary"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Сводка по источникам
          </button>
          <button
            onClick={() => setTab("ads")}
            className={`px-3 py-2 text-xs sm:text-sm rounded-t-lg flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === "ads"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Реклама
          </button>
          <button
            onClick={() => setTab("guests")}
            className={`px-3 py-2 text-xs sm:text-sm rounded-t-lg flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === "guests"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            Гости
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "summary" && <MarketingLeadsReport />}
        {tab === "ads" && <MarketingAdsReport />}
        {tab === "guests" && <MarketingGuests />}
      </div>
    </div>
  )
}
