"use client"

import { GameScheduleGrid } from "@/components/game-schedule-grid"

export function PersonnelScheduleAdmin() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">График игр</h1>
        <p className="text-sm text-muted-foreground mt-1">Назначение персонала на игры</p>
      </div>
      <GameScheduleGrid />
    </div>
  )
}
