"use client"

import { Users, Calendar, RussianRuble, User } from "lucide-react"

interface GameLead {
  id: string
  clientName: string
  clientPhone?: string
  gameDate: string
  gameTime?: string
  playersCount: number
  packagePrice: number
  totalAmount: number
  prepayment: number
  status: string
  responsibleName?: string
  createdAt?: string
}

interface GameKanbanCardProps {
  game: GameLead
}

export function GameKanbanCard({ game }: GameKanbanCardProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
  }

  const remaining = game.totalAmount - game.prepayment

  return (
    <div className="bg-background border rounded-lg p-2 hover:shadow-md transition-shadow">
      <div className="space-y-1.5">
        {/* Client name + created date */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <User className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium truncate">{game.clientName}</span>
          </div>
          {game.createdAt && (
            <span className="text-[9px] text-muted-foreground whitespace-nowrap" title={new Date(game.createdAt).toLocaleString("ru-RU")}>
              {formatDate(game.createdAt)}
            </span>
          )}
        </div>

        {/* Date and time */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span className="text-[10px]">
            {formatDate(game.gameDate)} {game.gameTime && `в ${game.gameTime}`}
          </span>
        </div>

        {/* Players count */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Users className="h-3 w-3" />
          <span className="text-[10px]">{game.playersCount} чел.</span>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <RussianRuble className="h-3 w-3 text-green-600" />
            <span className="text-xs font-semibold text-green-600">{game.totalAmount.toLocaleString()} ₽</span>
          </div>
          {game.prepayment > 0 && (
            <span className="text-[10px] text-muted-foreground">Предоплата: {game.prepayment.toLocaleString()} ₽</span>
          )}
        </div>

        {/* Remaining */}
        {remaining > 0 && <div className="text-[10px] text-orange-500">Остаток: {remaining.toLocaleString()} ₽</div>}

        {/* Responsible */}
        {game.responsibleName && (
          <div className="text-[10px] text-muted-foreground truncate">Ответственный: {game.responsibleName}</div>
        )}
      </div>
    </div>
  )
}
