"use client"

import { useState } from "react"
import { MarketingAutomation } from "@/components/marketing-automation"
import { MarketingLeadsReport } from "@/components/marketing-leads-report"
import { Megaphone, BarChart3 } from "lucide-react"

export default function MarketingPage() {
  const [tab, setTab] = useState<"campaigns" | "report">("report")

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 sm:px-6 pt-3">
        <div className="flex gap-1">
          <button
            onClick={() => setTab("report")}
            className={`px-3 py-2 text-xs sm:text-sm rounded-t-lg flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === "report"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Сводка по источникам
          </button>
          <button
            onClick={() => setTab("campaigns")}
            className={`px-3 py-2 text-xs sm:text-sm rounded-t-lg flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === "campaigns"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Кампании
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "report" ? <MarketingLeadsReport /> : <MarketingAutomation />}
      </div>
    </div>
  )
}
