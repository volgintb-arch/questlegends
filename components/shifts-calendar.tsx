"use client"

import { useState } from "react"
import { Clock, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useShifts } from "@/hooks/use-shifts"
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from "date-fns"
import { ru } from "date-fns/locale"
import type { Shift } from "@/lib/types"

interface ShiftsCalendarProps {
  locationId: string
  onCreateShift: () => void
  onEditShift: (shift: Shift) => void
}

export function ShiftsCalendar({ locationId, onCreateShift, onEditShift }: ShiftsCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const { data: shiftsData, isLoading } = useShifts({
    locationId,
    dateFrom: weekStart,
    dateTo: weekEnd,
  })

  const shifts = shiftsData?.data || []

  const getShiftsForDay = (date: Date) => {
    return shifts.filter((shift) => isSameDay(new Date(shift.date), date))
  }

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
      no_show: "bg-orange-100 text-orange-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek((prev) => subWeeks(prev, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="font-semibold">
            {format(weekStart, "d MMM", { locale: ru })} - {format(weekEnd, "d MMM yyyy", { locale: ru })}
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek((prev) => addWeeks(prev, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
            Сегодня
          </Button>
        </div>
        <Button onClick={onCreateShift}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить смену
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayShifts = getShiftsForDay(day)
          const isToday = isSameDay(day, new Date())

          return (
            <Card key={day.toISOString()} className={`p-3 min-h-[200px] ${isToday ? "ring-2 ring-primary" : ""}`}>
              <div className="font-semibold mb-2 text-sm">
                {format(day, "EEE", { locale: ru })}
                <div className="text-lg">{format(day, "d")}</div>
              </div>

              <div className="space-y-2">
                {dayShifts.map((shift) => (
                  <div
                    key={shift.id}
                    onClick={() => onEditShift(shift)}
                    className="p-2 rounded bg-secondary hover:bg-secondary/80 cursor-pointer text-xs"
                  >
                    <div className="font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {shift.start_time} - {shift.end_time}
                    </div>
                    <div className="text-muted-foreground truncate">{shift.role}</div>
                    <Badge variant="secondary" className={`mt-1 text-xs ${getStatusColor(shift.status)}`}>
                      {shift.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
