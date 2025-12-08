"use client"

import { MapPin, Phone } from "lucide-react"
import { Card } from "@/components/ui/card"

interface Deal {
  id: string
  title: string
  location: string
  amount: string
  daysOpen: number
  clientName?: string
  clientPhone?: string
}

interface DealKanbanCardProps {
  deal: Deal
}

export function DealKanbanCard({ deal }: DealKanbanCardProps) {
  return (
    <Card className="p-2 bg-background hover:shadow-md transition-shadow">
      <div className="space-y-1">
        <h4 className="text-xs font-medium truncate">{deal.title}</h4>

        {deal.location && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="text-[10px] truncate">{deal.location}</span>
          </div>
        )}

        {deal.clientPhone && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span className="text-[10px]">{deal.clientPhone}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-semibold text-primary">{deal.amount}</span>
          <span className="text-[10px] text-muted-foreground">
            {deal.daysOpen} {deal.daysOpen === 1 ? "день" : deal.daysOpen < 5 ? "дня" : "дней"}
          </span>
        </div>
      </div>
    </Card>
  )
}
