"use client"

import { useState } from "react"
import { Calendar, User, DollarSign, ChevronDown, ChevronUp } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface GameAssignment {
  id: string
  gameId: string
  date: string
  time: string
  staff: string[]
  participants: number
  package: string
}

interface SalaryDetail {
  employeeId: string
  name: string
  totalSalary: number
  games: { gameId: string; date: string; amount: number }[]
}

export function PersonnelFranchisee() {
  const { user } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState("2025-11")
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)

  // Mock game assignments
  const gameAssignments: GameAssignment[] = [
    {
      id: "GA-001",
      gameId: "G-001",
      date: "2025-11-27",
      time: "15:00",
      staff: ["Алексей С.", "Елена М."],
      participants: 8,
      package: "Стандарт",
    },
    {
      id: "GA-002",
      gameId: "G-002",
      date: "2025-11-28",
      time: "18:00",
      staff: ["Дмитрий Н.", "Татьяна К."],
      participants: 12,
      package: "Премиум",
    },
    {
      id: "GA-003",
      gameId: "G-003",
      date: "2025-11-29",
      time: "14:00",
      staff: ["Елена М.", "Дмитрий Н."],
      participants: 10,
      package: "Стандарт",
    },
  ]

  // Mock salary data
  const salaryData: SalaryDetail[] = [
    {
      employeeId: "F-001",
      name: "Алексей Сидоров",
      totalSalary: 28500,
      games: [
        { gameId: "G-001", date: "2025-11-27", amount: 3500 },
        { gameId: "G-005", date: "2025-11-22", amount: 4000 },
        { gameId: "G-010", date: "2025-11-15", amount: 3800 },
      ],
    },
    {
      employeeId: "F-002",
      name: "Елена Морозова",
      totalSalary: 32000,
      games: [
        { gameId: "G-001", date: "2025-11-27", amount: 3500 },
        { gameId: "G-003", date: "2025-11-29", amount: 3500 },
        { gameId: "G-008", date: "2025-11-20", amount: 4200 },
      ],
    },
    {
      employeeId: "F-003",
      name: "Дмитрий Никитин",
      totalSalary: 26000,
      games: [
        { gameId: "G-002", date: "2025-11-28", amount: 4000 },
        { gameId: "G-003", date: "2025-11-29", amount: 3500 },
      ],
    },
  ]

  const handleAssignmentChange = (gameId: string) => {
    console.log("[v0] Assignment changed for game:", gameId)
    // TODO: Send Telegram notification to staff (Scenario C4)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Персонал / График</h1>
        <p className="text-sm text-muted-foreground mt-1">Контроль рабочего времени и проверка начислений</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary">График Работы</button>
        <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          Отчет по ЗП
        </button>
      </div>

      {/* Schedule Calendar */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Назначения на Игры</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-muted border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="2025-11">Ноябрь 2025</option>
            <option value="2025-12">Декабрь 2025</option>
          </select>
        </div>

        <div className="space-y-3">
          {gameAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="bg-primary/20 p-3 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(assignment.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                    </p>
                    <span className="text-xs text-muted-foreground">{assignment.time}</span>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">{assignment.package}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <User size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{assignment.staff.join(", ")}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleAssignmentChange(assignment.gameId)}
                className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded text-xs transition-colors"
              >
                Изменить
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Salary Report */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Отчет по Заработной Плате</h2>
        <p className="text-xs text-muted-foreground mb-6">Детализация начислений за {selectedMonth}</p>

        <div className="space-y-3">
          {salaryData.map((employee) => (
            <div key={employee.employeeId} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedEmployee(expandedEmployee === employee.employeeId ? null : employee.employeeId)
                }
                className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">{employee.games.length} игр проведено</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary">
                    {employee.totalSalary.toLocaleString("ru-RU")} ₽
                  </span>
                  {expandedEmployee === employee.employeeId ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {expandedEmployee === employee.employeeId && (
                <div className="p-4 bg-card border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3">Детализация по играм:</p>
                  <div className="space-y-2">
                    {employee.games.map((game, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {new Date(game.date).toLocaleDateString("ru-RU")}
                          </span>
                          <span className="text-xs text-muted-foreground">({game.gameId})</span>
                        </div>
                        <span className="font-semibold text-foreground">{game.amount.toLocaleString("ru-RU")} ₽</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
