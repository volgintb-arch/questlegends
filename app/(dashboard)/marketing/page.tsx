"use client"

import { useState } from "react"
import { MarketingLeadsReport } from "@/components/marketing-leads-report"
import { MarketingAdsReport } from "@/components/marketing-ads-report"
import { MarketingGuests } from "@/components/marketing-guests"
import { BarChart3, Megaphone, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

type Tab = "summary" | "ads" | "guests"

export default function MarketingPage() {
  const { user } = useAuth()
  // «Гости» и вся seeker-passport интеграция — франчайзи-специфично.
  // УК-роли (super_admin/uk/uk_employee) вкладку не видят и не могут открыть.
  const isUK = user ? ["super_admin", "uk", "uk_employee"].includes(user.role) : false
  const [tab, setTab] = useState<Tab>("summary")

  const effectiveTab: Tab = tab === "guests" && isUK ? "summary" : tab

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 sm:px-6 pt-3">
        <div className="flex gap-1">
          <button
            onClick={() => setTab("summary")}
            className={`px-3 py-2 text-xs sm:text-sm rounded-t-lg flex items-center gap-1.5 border-b-2 transition-colors ${
              effectiveTab === "summary"
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
              effectiveTab === "ads"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Реклама
          </button>
          {!isUK && (
            <button
              onClick={() => setTab("guests")}
              className={`px-3 py-2 text-xs sm:text-sm rounded-t-lg flex items-center gap-1.5 border-b-2 transition-colors ${
                effectiveTab === "guests"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              Гости
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {effectiveTab === "summary" && <MarketingLeadsReport />}
        {effectiveTab === "ads" && <MarketingAdsReport />}
        {effectiveTab === "guests" && !isUK && <MarketingGuests />}
      </div>
    </div>
  )
}
