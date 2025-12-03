"use client"

import { useState } from "react"
import { Calendar, ChevronLeft, ChevronRight, User, CheckCircle2, AlertCircle, X, Filter } from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  role: "Аниматор" | "Ведущий" | "DJ"
  avatar?: string
}

interface GameEvent {
  id: string
  dealId: string
  clientName: string
  date: string
  startTime: string
  endTime: string
  location: string
  requiredAnimators: number
  requiredHosts: number
  requiredDJ: number
  assignedStaff: { staffId: string; role: string }[]
  status: "confirmed" | "completed"
  package: string
}

interface AssignmentModalData {
  game: GameEvent
  isOpen: boolean
}

export function PersonnelScheduleAdmin() {
  const [selectedDate, setSelectedDate] = useState("2025-01-20")
  const [viewMode, setViewMode] = useState<"week" | "day">("day")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [periodFilter, setPeriodFilter] = useState<string>("today")
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [showOnlyFree, setShowOnlyFree] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)

  const availableStaff: StaffMember[] = [
    { id: "s1", name: "Иванов Иван", role: "Аниматор" },
    { id: "s2", name: "Петрова Анна", role: "Аниматор" },
    { id: "s3", name: "Сидоров Петр", role: "Ведущий" },
    { id: "s4", name: "Козлова Мария", role: "DJ" },
    { id: "s5", name: "Новиков Алексей", role: "Аниматор" },
    { id: "s6", name: "Морозова Елена", role: "Ведущий" },
  ]

  const [gameEvents, setGameEvents] = useState<GameEvent[]>([
    {
      id: "g1",
      dealId: "deal-123",
      clientName: "ООО Рога и Копыта",
      date: "2025-01-20",
      startTime: "14:00",
      endTime: "16:00",
      location: "Москва",
      requiredAnimators: 2,
      requiredHosts: 1,
      requiredDJ: 0,
      assignedStaff: [{ staffId: "s1", role: "Аниматор" }],
      status: "confirmed",
      package: "Стандарт",
    },
    {
      id: "g2",
      dealId: "deal-456",
      clientName: "День рождения Василия",
      date: "2025-01-20",
      startTime: "18:00",
      endTime: "20:00",
      location: "Москва",
      requiredAnimators: 1,
      requiredHosts: 1,
      requiredDJ: 1,
      assignedStaff: [
        { staffId: "s2", role: "Аниматор" },
        { staffId: "s3", role: "Ведущий" },
        { staffId: "s4", role: "DJ" },
      ],
      status: "confirmed",
      package: "Премиум",
    },
  ])

  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = 10 + i
    return `${hour.toString().padStart(2, "0")}:00`
  })

  const filteredStaff = roleFilter === "all" ? availableStaff : availableStaff.filter((s) => s.role === roleFilter)

  const getPeriodDates = () => {
    const today = new Date()
    let from = new Date()
    let to = new Date()

    switch (periodFilter) {
      case "today":
        from = to = today
        break
      case "tomorrow":
        from = to = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        break
      case "this_week":
        from = today
        to = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        break
      case "next_week":
        from = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        to = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
        break
      case "this_month":
        from = new Date(today.getFullYear(), today.getMonth(), 1)
        to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        break
      case "custom":
        if (customDateFrom && customDateTo) {
          from = new Date(customDateFrom)
          to = new Date(customDateTo)
        }
        break
    }

    return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] }
  }

  const { from, to } = getPeriodDates()

  const filteredByEmployee = selectedEmployees.length > 0
    ? gameEvents.filter((g) => g.assignedStaff.some((a) => selectedEmployees.includes(a.staffId)))
    : gameEvents

  const filteredByStatus = statusFilter === "all" 
    ? filteredByEmployee
    : statusFilter === "requires_assignment"
    ? filteredByEmployee.filter((g) => !isGameComplete(g))
    : statusFilter === "staffed"
    ? filteredByEmployee.filter((g) => isGameComplete(g) && g.status !== "completed")
    : filteredByEmployee.filter((g) => g.status === "completed")

  const displayedGames = filteredByStatus.filter((g) => {
    const gameDate = new Date(g.date)
    const fromDate = new Date(from)
    const toDate = new Date(to)
    return gameDate >= fromDate && gameDate <= toDate
  })

  const getRequiredStaffCount = (game: GameEvent) => {
    return game.requiredAnimators + game.requiredHosts + game.requiredDJ
  }

  const getAssignedStaffCount = (game: GameEvent) => {
    return game.assignedStaff.length
  }

  const isGameComplete = (game: GameEvent) => {
    return getAssignedStaffCount(game) >= getRequiredStaffCount(game)
  }

  const getStaffById = (id: string) => {
    return availableStaff.find((s) => s.id === id)
  }

  const handleDragStart = (staff: StaffMember) => {
    setDraggedStaff(staff)
  }

  const handleDropOnGame = (game: GameEvent) => {
    if (!draggedStaff) return

    // Check if staff already assigned
    if (game.assignedStaff.some((a) => a.staffId === draggedStaff.id)) {
      alert("Этот сотрудник уже назначен на эту игру")
      setDraggedStaff(null)
      return
    }

    // Add staff to game
    const updatedGames = gameEvents.map((g) => {
      if (g.id === game.id) {
        return {
          ...g,
          assignedStaff: [...g.assignedStaff, { staffId: draggedStaff.id, role: draggedStaff.role }],
        }
      }
      return g
    })

    setGameEvents(updatedGames)
    setDraggedStaff(null)

    console.log("[v0] Webhook: Staff assigned", {
      gameId: game.id,
      staffId: draggedStaff.id,
      staffName: draggedStaff.name,
      dealId: game.dealId,
    })
  }

  const handleRemoveStaff = (gameId: string, staffId: string) => {
    const updatedGames = gameEvents.map((g) => {
      if (g.id === gameId) {
        return {
          ...g,
          assignedStaff: g.assignedStaff.filter((a) => a.staffId !== staffId),
        }
      }
      return g
    })
    setGameEvents(updatedGames)
  }

  const openAssignmentModal = (game: GameEvent) => {
    setAssignmentModal({ game, isOpen: true })
  }

  const [assignmentModal, setAssignmentModal] = useState<AssignmentModalData>({
    game: null as any,
    isOpen: false,
  })
  const [draggedStaff, setDraggedStaff] = useState<StaffMember | null>(null)

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-80 bg-card border-r border-border p-6 overflow-y-auto">
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors mb-4"
          >
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-primary" />
              <span className="font-semibold text-foreground">Фильтры</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {showFilters ? "Скрыть" : "Показать"}
            </span>
          </button>

          {showFilters && (
            <div className="space-y-4 bg-muted/50 rounded-lg p-4">
              {/* Period filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Период</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    onClick={() => setPeriodFilter("today")}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      periodFilter === "today"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border hover:bg-muted"
                    }`}
                  >
                    Сегодня
                  </button>
                  <button
                    onClick={() => setPeriodFilter("tomorrow")}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      periodFilter === "tomorrow"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border hover:bg-muted"
                    }`}
                  >
                    Завтра
                  </button>
                  <button
                    onClick={() => setPeriodFilter("this_week")}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      periodFilter === "this_week"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border hover:bg-muted"
                    }`}
                  >
                    Эта неделя
                  </button>
                  <button
                    onClick={() => setPeriodFilter("next_week")}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      periodFilter === "next_week"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border hover:bg-muted"
                    }`}
                  >
                    След. неделя
                  </button>
                  <button
                    onClick={() => setPeriodFilter("this_month")}
                    className={`px-3 py-2 rounded-lg text-sm col-span-2 transition-colors ${
                      periodFilter === "this_month"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border hover:bg-muted"
                    }`}
                  >
                    Месяц
                  </button>
                </div>

                {periodFilter === "custom" && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                      placeholder="От"
                    />
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                      placeholder="До"
                    />
                  </div>
                )}

                <button
                  onClick={() => setPeriodFilter("custom")}
                  className="w-full mt-2 px-3 py-2 bg-background border border-border hover:bg-muted rounded-lg text-sm transition-colors"
                >
                  Произвольный период
                </button>
              </div>

              {/* Status filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Статус игры</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="all">Все</option>
                  <option value="requires_assignment">Требуется назначение</option>
                  <option value="staffed">Укомплектованные</option>
                  <option value="completed">Прошедшие</option>
                </select>
              </div>

              {/* Show only free checkbox */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyFree}
                    onChange={(e) => setShowOnlyFree(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-foreground">Показать только свободных</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Доступный Персонал</h2>

          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm"
            >
              <option value="all">Все роли</option>
              <option value="Аниматор">Аниматоры</option>
              <option value="Ведущий">Ведущие</option>
              <option value="DJ">DJ</option>
            </select>
          </div>
        </div>

        <div className="mb-4 bg-primary/10 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Загруженность за период:</h3>
          <div className="space-y-1 text-xs">
            {filteredStaff.slice(0, 3).map((staff) => {
              const assignedGames = displayedGames.filter((g) => 
                g.assignedStaff.some((a) => a.staffId === staff.id)
              ).length
              const percentage = Math.round((assignedGames / displayedGames.length) * 100) || 0

              return (
                <div key={staff.id} className="flex justify-between text-muted-foreground">
                  <span>{staff.name}</span>
                  <span className="font-medium text-foreground">
                    {assignedGames} игр ({percentage}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          {filteredStaff.map((staff) => {
            const isSelected = selectedEmployees.includes(staff.id)
            
            return (
              <div
                key={staff.id}
                draggable
                onDragStart={() => handleDragStart(staff)}
                onClick={() => {
                  if (isSelected) {
                    setSelectedEmployees(selectedEmployees.filter((id) => id !== staff.id))
                  } else {
                    setSelectedEmployees([...selectedEmployees, staff.id])
                  }
                }}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary/20 border-primary"
                    : "bg-muted hover:bg-primary/10 border-border"
                }`}
              >
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <User size={20} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{staff.name}</p>
                  <p className="text-xs text-muted-foreground">{staff.role}</p>
                </div>
                {isSelected && <CheckCircle2 size={16} className="text-primary" />}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">График Работы / Назначение Персонала</h1>
          <p className="text-muted-foreground">Шахматка с назначением персонала на игры</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                const date = new Date(selectedDate)
                date.setDate(date.getDate() - 1)
                setSelectedDate(date.toISOString().split("T")[0])
              }}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-foreground" />
            </button>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("day")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === "day"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  День
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === "week"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  Неделя
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                const date = new Date(selectedDate)
                date.setDate(date.getDate() + 1)
                setSelectedDate(date.toISOString().split("T")[0])
              }}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-foreground" />
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Grid header */}
          <div className="grid grid-cols-[100px_1fr] border-b border-border">
            <div className="p-4 bg-muted/50 border-r border-border">
              <p className="text-sm font-semibold text-foreground">Время</p>
            </div>
            <div className="p-4 bg-muted/50">
              <p className="text-sm font-semibold text-foreground">Игры / События</p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {timeSlots.map((time) => {
              const gamesAtTime = displayedGames.filter((g) => g.startTime === time)

              return (
                <div key={time} className="grid grid-cols-[100px_1fr] min-h-[80px]">
                  <div className="p-4 bg-muted/30 border-r border-border flex items-start">
                    <p className="text-sm font-medium text-foreground">{time}</p>
                  </div>

                  <div className="p-2 flex flex-wrap gap-2">
                    {gamesAtTime.map((game) => (
                      <div
                        key={game.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropOnGame(game)}
                        onClick={() => openAssignmentModal(game)}
                        className={`flex-1 min-w-[300px] p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          game.status === "completed"
                            ? "bg-muted border-muted-foreground/30"
                            : isGameComplete(game)
                              ? "bg-primary/10 border-primary hover:bg-primary/20"
                              : "bg-destructive/10 border-destructive hover:bg-destructive/20"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-foreground">{game.clientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {game.startTime} - {game.endTime}
                            </p>
                          </div>
                          {isGameComplete(game) ? (
                            <CheckCircle2 size={20} className="text-success" />
                          ) : (
                            <AlertCircle size={20} className="text-destructive" />
                          )}
                        </div>

                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            Требуется: {game.requiredAnimators} Аниматор + {game.requiredHosts} Ведущий +{" "}
                            {game.requiredDJ} DJ
                          </p>
                          <p className="text-xs font-medium text-foreground">
                            Назначено: {getAssignedStaffCount(game)} / {getRequiredStaffCount(game)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {game.assignedStaff.map((assignment) => {
                            const staff = getStaffById(assignment.staffId)
                            if (!staff) return null

                            return (
                              <div
                                key={assignment.staffId}
                                className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-1 rounded text-xs"
                              >
                                <User size={12} />
                                <span>{staff.name}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveStaff(game.id, staff.id)
                                  }}
                                  className="hover:bg-primary/30 rounded p-0.5"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {assignmentModal.isOpen && assignmentModal.game && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card">
              <h2 className="text-xl font-bold text-foreground">Назначение Персонала</h2>
              <button
                onClick={() => setAssignmentModal({ game: null as any, isOpen: false })}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={20} className="text-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Game info */}
              <div className="bg-muted rounded-lg p-4">
                <p className="font-semibold text-foreground mb-2">{assignmentModal.game.clientName}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground">
                    Время:{" "}
                    <span className="text-foreground">
                      {assignmentModal.game.startTime} - {assignmentModal.game.endTime}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Пакет: <span className="text-foreground">{assignmentModal.game.package}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Локация: <span className="text-foreground">{assignmentModal.game.location}</span>
                  </p>
                  <p className="text-muted-foreground">
                    ID Сделки: <span className="text-foreground">{assignmentModal.game.dealId}</span>
                  </p>
                </div>
              </div>

              {/* Required staff breakdown */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Требуемый состав:</h3>
                <div className="space-y-3">
                  {assignmentModal.game.requiredAnimators > 0 && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm font-medium text-foreground mb-2">
                        Аниматоры: {assignmentModal.game.requiredAnimators}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availableStaff
                          .filter((s) => s.role === "Аниматор")
                          .map((staff) => {
                            const isAssigned = assignmentModal.game.assignedStaff.some((a) => a.staffId === staff.id)
                            return (
                              <button
                                key={staff.id}
                                onClick={() => {
                                  if (isAssigned) {
                                    handleRemoveStaff(assignmentModal.game.id, staff.id)
                                  } else {
                                    setDraggedStaff(staff)
                                    handleDropOnGame(assignmentModal.game)
                                  }
                                }}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                  isAssigned
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background border border-border hover:bg-muted"
                                }`}
                              >
                                {staff.name} {isAssigned && "✓"}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {assignmentModal.game.requiredHosts > 0 && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm font-medium text-foreground mb-2">
                        Ведущие: {assignmentModal.game.requiredHosts}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availableStaff
                          .filter((s) => s.role === "Ведущий")
                          .map((staff) => {
                            const isAssigned = assignmentModal.game.assignedStaff.some((a) => a.staffId === staff.id)
                            return (
                              <button
                                key={staff.id}
                                onClick={() => {
                                  if (isAssigned) {
                                    handleRemoveStaff(assignmentModal.game.id, staff.id)
                                  } else {
                                    setDraggedStaff(staff)
                                    handleDropOnGame(assignmentModal.game)
                                  }
                                }}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                  isAssigned
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background border border-border hover:bg-muted"
                                }`}
                              >
                                {staff.name} {isAssigned && "✓"}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {assignmentModal.game.requiredDJ > 0 && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm font-medium text-foreground mb-2">DJ: {assignmentModal.game.requiredDJ}</p>
                      <div className="flex flex-wrap gap-2">
                        {availableStaff
                          .filter((s) => s.role === "DJ")
                          .map((staff) => {
                            const isAssigned = assignmentModal.game.assignedStaff.some((a) => a.staffId === staff.id)
                            return (
                              <button
                                key={staff.id}
                                onClick={() => {
                                  if (isAssigned) {
                                    handleRemoveStaff(assignmentModal.game.id, staff.id)
                                  } else {
                                    setDraggedStaff(staff)
                                    handleDropOnGame(assignmentModal.game)
                                  }
                                }}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                  isAssigned
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background border border-border hover:bg-muted"
                                }`}
                              >
                                {staff.name} {isAssigned && "✓"}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment status */}
              <div
                className={`p-4 rounded-lg border-2 ${
                  isGameComplete(assignmentModal.game)
                    ? "bg-success/10 border-success"
                    : "bg-destructive/10 border-destructive"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isGameComplete(assignmentModal.game) ? (
                    <>
                      <CheckCircle2 size={20} className="text-success" />
                      <p className="font-medium text-success">Игра полностью укомплектована</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={20} className="text-destructive" />
                      <p className="font-medium text-destructive">
                        Не хватает:{" "}
                        {getRequiredStaffCount(assignmentModal.game) - getAssignedStaffCount(assignmentModal.game)}{" "}
                        сотрудников
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setAssignmentModal({ game: null as any, isOpen: false })}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
