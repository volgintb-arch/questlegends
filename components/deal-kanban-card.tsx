"use client"

import { MapPin, User } from "lucide-react"
import { Card } from "@/components/ui/card"

interface Deal {
  id: string
  title: string
  location: string
  amount: string
  daysOpen: number
  clientName?: string
  clientPhone?: string
  contactName?: string
  city?: string
  responsibleName?: string
}

interface DealKanbanCardProps {
  deal: Deal
}

export function DealKanbanCard({ deal }: DealKanbanCardProps) {
  const displayName = deal.contactName || deal.clientName || deal.title
  const displayCity = deal.city || deal.location

  return (
    <Card className="p-2 bg-background hover:shadow-md transition-shadow">
      <div className="space-y-1">
        <h4 className="text-xs font-medium truncate">{displayName}</h4>

        {displayCity && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="text-[10px] truncate">{displayCity}</span>
          </div>
        )}

        {deal.responsibleName && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="text-[10px] truncate">{deal.responsibleName}</span>
          </div>
        )}

        <div className="flex items-center justify-end pt-1">
          <span className="text-[10px] text-muted-foreground">
            {deal.daysOpen} {deal.daysOpen === 1 ? "день" : deal.daysOpen < 5 ? "дня" : "дней"}
          </span>
        </div>
      </div>
    </Card>
  )
}
