"use client"

import { useState, useCallback, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Music,
  Mic,
  UserCircle,
  AlertCircle,
  GripVertical,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ScheduleItem {
  id: string
  leadId: string
  gameDate: string
  gameTime: string
  gameDuration: number // Added game duration in hours
  clientName: string
  playersCount: number
  totalAmount: number
  status: string
  staff: StaffAssignment[]
  animatorsNeeded: number
  hostsNeeded: number
  djsNeeded: number
}

interface StaffAssignment {
  id: string
  personnelId: string
  personnelName: string
  role: string
  rate: number
}

interface Personnel {
  id: string
  name: string
  role: string
  phone?: string
  rate?: number
}

export function GameScheduleGrid() {
  const { user, getAuthHeaders } = useAuth()
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.setDate(diff))
  })
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null)
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false)
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [draggedPerson, setDraggedPerson] = useState<Personnel | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>("all")

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  const timeSlots = [
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
  ]

  const fetchSchedule = useCallback(async () => {
    if (!user?.franchiseeId) return

    try {
      setLoading(true)
      const startDate = currentWeekStart.toISOString().split("T")[0]
      const endDate = new Date(currentWeekStart)
      endDate.setDate(endDate.getDate() + 6)
      const endDateStr = endDate.toISOString().split("T")[0]

      console.log("[v0] Fetching schedule for:", startDate, "to", endDateStr)

      const res = await fetch(
        `/api/game-schedule?franchiseeId=${user.franchiseeId}&startDate=${startDate}&endDate=${endDateStr}`,
        { headers: getAuthHeaders() },
      )
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Schedule data received:", data.data)
        setScheduleItems(data.data || [])
      }
    } catch (e) {
      console.error("[v0] Error fetching schedule:", e)
    } finally {
      setLoading(false)
    }
  }, [user?.franchiseeId, currentWeekStart, getAuthHeaders])

  const normalizeDate = (dateStr: string | Date | null | undefined): string => {
    if (!dateStr) return ""
    // If already in YYYY-MM-DD format, return as is
    if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr
    if (isNaN(date.getTime())) return ""
    // Format as YYYY-MM-DD
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const getTimeSlotHour = (timeStr: string | null | undefined): string => {
    if (!timeStr) return "14:00"
    // Handle formats like "12:30", "12:30:00", etc.
    const match = timeStr.match(/^(\d{1,2})/)
    if (match) {
      const hour = Number.parseInt(match[1], 10)
      return `${String(hour).padStart(2, "0")}:00`
    }
    return "14:00"
  }

  const fetchPersonnel = useCallback(async () => {
    if (!user?.franchiseeId) return

    try {
      console.log("[v0] Fetching personnel for franchisee:", user.franchiseeId)
      const res = await fetch(`/api/personnel?franchiseeId=${user.franchiseeId}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Personnel data received:", data)
        setPersonnel(data.data || data || [])
      }
    } catch (e) {
      console.error("[v0] Error fetching personnel:", e)
    }
  }, [user?.franchiseeId, getAuthHeaders])

  const getItemsForSlot = (date: Date, time: string) => {
    const dateStr = normalizeDate(date)
    return scheduleItems.filter((item) => {
      const itemDateStr = normalizeDate(item.gameDate)
      const itemTimeSlot = getTimeSlotHour(item.gameTime)

      const duration = item.gameDuration || 3 // Default 3 hours
      const itemHour = Number.parseInt(itemTimeSlot.split(":")[0], 10)
      const slotHour = Number.parseInt(time.split(":")[0], 10)

      // Game spans from itemHour to itemHour + duration
      const isInTimeRange = slotHour >= itemHour && slotHour < itemHour + duration
      const matches = itemDateStr === dateStr && isInTimeRange

      if (matches) {
        console.log("[v0] Found item for slot:", dateStr, time, item.clientName)
      }
      return matches
    })
  }

  const isStaffComplete = (item: ScheduleItem) => {
    const animatorsAssigned = item.staff?.filter((s) => s.role === "animator").length || 0
    const hostsAssigned = item.staff?.filter((s) => s.role === "host").length || 0
    const djsAssigned = item.staff?.filter((s) => s.role === "dj").length || 0

    return (
      animatorsAssigned >= (item.animatorsNeeded || 0) &&
      hostsAssigned >= (item.hostsNeeded || 0) &&
      djsAssigned >= (item.djsNeeded || 0)
    )
  }

  const canAssignMore = (item: ScheduleItem, role: string) => {
    const assigned = item.staff?.filter((s) => s.role === role).length || 0
    const needed =
      role === "animator" ? item.animatorsNeeded || 0 : role === "host" ? item.hostsNeeded || 0 : item.djsNeeded || 0
    return assigned < needed
  }

  const handleDragStart = (person: Personnel) => {
    setDraggedPerson(person)
  }

  const handleDragEnd = () => {
    setDraggedPerson(null)
  }

  const handleDrop = async (item: ScheduleItem) => {
    if (!draggedPerson) return

    if (item.staff?.some((s) => s.personnelId === draggedPerson.id)) {
      alert("Этот сотрудник уже назначен на эту игру")
      setDraggedPerson(null)
      return
    }

    if (!canAssignMore(item, draggedPerson.role)) {
      alert(
        `Все ${draggedPerson.role === "animator" ? "аниматоры" : draggedPerson.role === "host" ? "ведущие" : "DJ"} уже назначены`,
      )
      setDraggedPerson(null)
      return
    }

    try {
      const res = await fetch(`/api/game-schedule/${item.id}/staff`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          personnelId: draggedPerson.id,
          personnelName: draggedPerson.name,
          role: draggedPerson.role,
          rate: draggedPerson.rate || 0,
        }),
      })

      if (res.ok) {
        fetchSchedule()
        if (selectedItem?.id === item.id) {
          const updated = await res.json()
          setSelectedItem(updated.data || updated)
        }
      }
    } catch (e) {
      console.error("[v0] Error assigning staff:", e)
    }

    setDraggedPerson(null)
  }

  const handleRemoveStaff = async (item: ScheduleItem, assignmentId: string) => {
    try {
      const res = await fetch(`/api/game-schedule/${item.id}/staff/${assignmentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (res.ok) {
        fetchSchedule()
        if (selectedItem?.id === item.id) {
          setSelectedItem({
            ...selectedItem,
            staff: selectedItem.staff.filter((s) => s.id !== assignmentId),
          })
        }
      }
    } catch (e) {
      console.error("[v0] Error removing staff:", e)
    }
  }

  const openStaffModal = (item: ScheduleItem) => {
    setSelectedItem(item)
    setIsStaffModalOpen(true)
  }

  const filteredPersonnel = roleFilter === "all" ? personnel : personnel.filter((p) => p.role === roleFilter)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "animator":
        return <Users className="h-3 w-3" />
      case "host":
        return <Mic className="h-3 w-3" />
      case "dj":
        return <Music className="h-3 w-3" />
      default:
        return <UserCircle className="h-3 w-3" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "animator":
        return "Аниматор"
      case "host":
        return "Ведущий"
      case "dj":
        return "DJ"
      default:
        return role
    }
  }

  // Added refresh function
  const handleRefresh = () => {
    fetchSchedule()
    fetchPersonnel()
  }

  const prevWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeekStart(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeekStart(newDate)
  }

  const isFirstSlot = (item: ScheduleItem, time: string) => {
    const itemTimeSlot = getTimeSlotHour(item.gameTime)
    return itemTimeSlot === time
  }

  const getRowSpan = (item: ScheduleItem) => {
    return item.gameDuration || 3 // Default 3 hours
  }

  const getStaffCount = (item: ScheduleItem, role: string) => {
    return item.staff?.filter((s) => s.role === role).length || 0
  }

  useEffect(() => {
    if (user?.franchiseeId) {
      console.log("[v0] Schedule grid: Starting data fetch for franchisee:", user.franchiseeId)
      fetchSchedule()
      fetchPersonnel()
    }
  }, [user?.franchiseeId, fetchSchedule, fetchPersonnel])

  if (loading && scheduleItems.length === 0) {
    return <div className="flex items-center justify-center h-64">Загрузка графика...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          График игр
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} title="Обновить">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">
            {currentWeekStart.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} -{" "}
            {weekDays[6].toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Personnel sidebar + Grid */}
      <div className="flex gap-4">
        {/* Personnel list */}
        <div className="w-48 flex-shrink-0 space-y-2">
          <div className="text-sm font-medium mb-2">Персонал ({personnel.length})</div>
          <div className="flex gap-1 mb-2">
            <Button
              variant={roleFilter === "all" ? "default" : "outline"}
              size="sm"
              className="text-xs px-2"
              onClick={() => setRoleFilter("all")}
            >
              Все
            </Button>
            <Button
              variant={roleFilter === "animator" ? "default" : "outline"}
              size="sm"
              className="text-xs px-2"
              onClick={() => setRoleFilter("animator")}
            >
              А
            </Button>
            <Button
              variant={roleFilter === "host" ? "default" : "outline"}
              size="sm"
              className="text-xs px-2"
              onClick={() => setRoleFilter("host")}
            >
              В
            </Button>
            <Button
              variant={roleFilter === "dj" ? "default" : "outline"}
              size="sm"
              className="text-xs px-2"
              onClick={() => setRoleFilter("dj")}
            >
              DJ
            </Button>
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {filteredPersonnel.map((person) => (
              <div
                key={person.id}
                draggable
                onDragStart={() => handleDragStart(person)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "p-2 rounded border cursor-grab active:cursor-grabbing flex items-center gap-2 text-sm",
                  "bg-card hover:bg-muted transition-colors",
                  draggedPerson?.id === person.id && "opacity-50",
                )}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                {getRoleIcon(person.role)}
                <span className="truncate">{person.name}</span>
              </div>
            ))}
            {filteredPersonnel.length === 0 && <div className="text-sm text-muted-foreground p-2">Нет персонала</div>}
          </div>
        </div>

        {/* Schedule grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Days header */}
            <div className="grid grid-cols-8 gap-1 mb-1">
              <div className="p-2 text-center text-sm font-medium">Время</div>
              {weekDays.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-2 text-center text-sm font-medium rounded",
                    normalizeDate(day) === normalizeDate(new Date()) && "bg-primary/10",
                  )}
                >
                  {formatDate(day)}
                </div>
              ))}
            </div>

            {/* Time slots */}
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-8 gap-1 mb-1">
                <div className="bg-muted p-2 text-center text-sm font-medium rounded">{time}</div>

                {weekDays.map((day, dayIndex) => {
                  const items = getItemsForSlot(day, time)

                  const visibleItems = items.filter((item) => isFirstSlot(item, time))

                  return (
                    <div key={`${dayIndex}-${time}`} className="relative min-h-[80px] bg-card border rounded p-1">
                      {visibleItems.map((item) => {
                        const staffStatus = isStaffComplete(item)
                        const rowSpan = getRowSpan(item)

                        return (
                          <div
                            key={item.id}
                            onClick={() => openStaffModal(item)}
                            className={cn(
                              "absolute inset-0 p-2 rounded cursor-pointer transition-all hover:shadow-md",
                              "overflow-hidden",
                            )}
                            style={{
                              height: `calc(${rowSpan * 100}% + ${(rowSpan - 1) * 4}px)`,
                              zIndex: 10,
                            }}
                          >
                            <div
                              className={cn(
                                "h-full flex flex-col gap-1 p-2 rounded border-2",
                                staffStatus ? "bg-green-500/10 border-green-500" : "bg-red-500/10 border-red-500",
                              )}
                            >
                              <p className="text-xs font-semibold truncate">{item.clientName}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.gameTime} ({item.gameDuration || 3}ч)
                              </p>
                              <p className="text-xs text-muted-foreground">{item.playersCount} чел.</p>
                              <div className="flex gap-1 flex-wrap">
                                <span
                                  className={cn(
                                    "text-xs px-1 py-0.5 rounded",
                                    getStaffCount(item, "animator") >= item.animatorsNeeded
                                      ? "bg-green-500/20 text-green-700"
                                      : "bg-red-500/20 text-red-700",
                                  )}
                                >
                                  А:{getStaffCount(item, "animator")}/{item.animatorsNeeded}
                                </span>
                                <span
                                  className={cn(
                                    "text-xs px-1 py-0.5 rounded",
                                    getStaffCount(item, "host") >= item.hostsNeeded
                                      ? "bg-green-500/20 text-green-700"
                                      : "bg-red-500/20 text-red-700",
                                  )}
                                >
                                  В:{getStaffCount(item, "host")}/{item.hostsNeeded}
                                </span>
                                <span
                                  className={cn(
                                    "text-xs px-1 py-0.5 rounded",
                                    getStaffCount(item, "dj") >= item.djsNeeded
                                      ? "bg-green-500/20 text-green-700"
                                      : "bg-red-500/20 text-red-700",
                                  )}
                                >
                                  DJ:{getStaffCount(item, "dj")}/{item.djsNeeded}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff assignment modal */}
      <Dialog open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Назначение персонала</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded">
                <div className="font-medium">{selectedItem.clientName || "Игра"}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedItem.gameDate} в {selectedItem.gameTime} • {selectedItem.playersCount || 0} чел.
                </div>
              </div>

              {/* Required staff */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Требуется персонал:</div>
                <div className="flex gap-2">
                  {(selectedItem.animatorsNeeded || 0) > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Аниматоры: {selectedItem.staff?.filter((s) => s.role === "animator").length || 0}/
                      {selectedItem.animatorsNeeded}
                    </Badge>
                  )}
                  {(selectedItem.hostsNeeded || 0) > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Mic className="h-3 w-3" />
                      Ведущие: {selectedItem.staff?.filter((s) => s.role === "host").length || 0}/
                      {selectedItem.hostsNeeded}
                    </Badge>
                  )}
                  {(selectedItem.djsNeeded || 0) > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Music className="h-3 w-3" />
                      DJ: {selectedItem.staff?.filter((s) => s.role === "dj").length || 0}/{selectedItem.djsNeeded}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Assigned staff */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Назначенный персонал:</div>
                {selectedItem.staff && selectedItem.staff.length > 0 ? (
                  <div className="space-y-1">
                    {selectedItem.staff.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(assignment.role)}
                          <span>{assignment.personnelName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {getRoleLabel(assignment.role)}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveStaff(selectedItem, assignment.id)}
                        >
                          Удалить
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Персонал не назначен. Перетащите сотрудника из списка слева.
                  </div>
                )}
              </div>

              {/* Available to assign */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Доступный персонал:</div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {personnel
                    .filter((p) => !selectedItem.staff?.some((s) => s.personnelId === p.id))
                    .filter((p) => canAssignMore(selectedItem, p.role))
                    .map((person) => (
                      <div
                        key={person.id}
                        onClick={() => {
                          setDraggedPerson(person)
                          handleDrop(selectedItem)
                        }}
                        className="p-2 border rounded cursor-pointer hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        {getRoleIcon(person.role)}
                        <span className="text-sm">{person.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
