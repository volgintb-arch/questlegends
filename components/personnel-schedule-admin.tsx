"use client"

import { useState, useEffect } from "react"
import { Calendar, Filter, ChevronLeft, ChevronRight, Users, X, Check } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface StaffMember {
  id: string
  name: string
  role: "Аниматор" | "Ведущий" | "DJ"
  avatar?: string
  phone: string
  status: "available"
  workingHours: string
  rating: number
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
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"day" | "week">("day")
  const [roleFilter, setRoleFilter] = useState<"all" | "animator" | "host" | "dj">("all")
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([])
  const [isLoadingStaff, setIsLoadingStaff] = useState(true)
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showOnlyFree, setShowOnlyFree] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [draggedStaff, setDraggedStaff] = useState<StaffMember | null>(null)
  const [assignmentModal, setAssignmentModal] = useState<AssignmentModalData>({
    game: null as any,
    isOpen: false,
  })

  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = 10 + i
    return `${hour.toString().padStart(2, "0")}:00`
  })

  const filteredStaff = roleFilter === "all" ? availableStaff : availableStaff.filter((s) => s.role === roleFilter)

  useEffect(() => {
    if (user?.franchiseeId) {
      fetchStaff()
      fetchGameEvents()
    }
  }, [user])

  const fetchStaff = async () => {
    try {
      setIsLoadingStaff(true)
      const response = await fetch(`/api/personnel?franchiseeId=${user?.franchiseeId}`)
      if (response.ok) {
        const data = await response.json()
        const formattedStaff = data.map((p: any) => ({
          id: p.id,
          name: p.user?.name || "Unknown",
          role: p.position || "Персонал",
          phone: p.user?.phone || "",
          status: "available" as const,
          workingHours: p.workingHours || "Полный день",
          rating: p.rating || 4.5,
        }))
        setAvailableStaff(formattedStaff)
      }
    } catch (error) {
      console.error("[v0] Error fetching staff:", error)
    } finally {
      setIsLoadingStaff(false)
    }
  }

  const fetchGameEvents = async () => {
    try {
      setLoadingGames(true)
      const response = await fetch(`/api/deals?franchiseeId=${user?.franchiseeId}`)
      if (response.ok) {
        const deals = await response.json()
        const events = deals
          .filter((d: any) => d.gameDate && d.stage === "Внесена предоплата (Бронь)")
          .map((d: any) => ({
            id: d.id,
            dealId: d.id,
            clientName: d.clientName || "Клиент",
            date: new Date(d.gameDate).toISOString().split("T")[0],
            startTime: d.gameStartTime || "14:00",
            endTime: d.gameEndTime || "16:00",
            location: d.franchisee?.city || "",
            requiredAnimators: d.animatorsCount || 0,
            requiredHosts: d.hostsCount || 0,
            requiredDJ: d.djsCount || 0,
            assignedStaff: [],
            status: "confirmed" as const,
            package: d.packageType || "",
          }))
        setGameEvents(events)
      }
    } catch (error) {
      console.error("[v0] Error fetching game events:", error)
    } finally {
      setLoadingGames(false)
    }
  }

  const getPeriodDates = () => {
    const today = new Date()
    let from = new Date()
    let to = new Date()

    switch (viewMode) {
      case "day":
        from = to = selectedDate
        break
      case "week":
        from = new Date(selectedDate.getTime())
        to = new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        break
    }

    return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] }
  }

  const { from, to } = getPeriodDates()

  const displayedGames = gameEvents.filter((g) => {
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

    if (game.assignedStaff.some((a) => a.staffId === draggedStaff.id)) {
      alert("Этот сотрудник уже назначен на эту игру")
      setDraggedStaff(null)
      return
    }

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

  if (isLoadingStaff || loadingGames) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    )
  }

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
            <span className="text-sm text-muted-foreground">{showFilters ? "Скрыть" : "Показать"}</span>
          </button>

          {showFilters && (
            <div className="space-y-4 bg-muted/50 rounded-lg p-4">
              {/* Period filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Период</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    onClick={() => setViewMode("day")}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      viewMode === "day"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border hover:bg-muted"
                    }`}
                  >
                    Сегодня
                  </button>
                  <button
                    onClick={() => setViewMode("week")}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      viewMode === "week"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border hover:bg-muted"
                    }`}
                  >
                    Эта неделя
                  </button>
                </div>
              </div>

              {/* Role filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Роль</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="all">Все роли</option>
                  <option value="Аниматор">Аниматоры</option>
                  <option value="Ведущий">Ведущие</option>
                  <option value="DJ">DJ</option>
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
            <Users size={18} className="text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
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
                g.assignedStaff.some((a) => a.staffId === staff.id),
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
                  isSelected ? "bg-primary/20 border-primary" : "bg-muted hover:bg-primary/10 border-border"
                }`}
              >
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Users size={20} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{staff.name}</p>
                  <p className="text-xs text-muted-foreground">{staff.role}</p>
                </div>
                {isSelected && <Check size={16} className="text-primary" />}
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
                setSelectedDate(date)
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
                  value={selectedDate.toISOString().split("T")[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
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
                setSelectedDate(date)
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
                            <Check size={20} className="text-success" />
                          ) : (
                            <X size={20} className="text-destructive" />
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
                                <Users size={12} />
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
                      <Check size={20} className="text-success" />
                      <p className="font-medium text-success">Игра полностью укомплектована</p>
                    </>
                  ) : (
                    <>
                      <X size={20} className="text-destructive" />
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
