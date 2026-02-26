"use client"

import { DollarSign, TrendingDown, Users, AlertTriangle, Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TransactionFormModal } from "./transaction-form-modal"
import { GameCreateModal } from "./game-create-modal"

export function DashboardAdmin() {
  const { user, getAuthHeaders } = useAuth()
  const router = useRouter()
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showGameModal, setShowGameModal] = useState(false)
  const [pipeline, setPipeline] = useState<any>(null)

  const [metrics, setMetrics] = useState({
    revenue: 0,
    expenses: 0,
    payroll: 0,
  })
  const [gamesRequiringAssignment, setGamesRequiringAssignment] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
    loadGamesRequiringAssignment()
    loadPipeline()
  }, [user?.franchiseeId])

  const loadMetrics = async () => {
    if (!user?.franchiseeId) return

    try {
      const transactionsRes = await fetch(`/api/transactions?franchiseeId=${user.franchiseeId}`, {
        headers: getAuthHeaders(),
      })

      let revenue = 0
      let expenses = 0
      let payroll = 0

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json()
        const transactions = transactionsData.data || transactionsData.transactions || transactionsData || []

        transactions.forEach((t: any) => {
          const amount = Number(t.amount) || 0
          if (t.type === "income") {
            revenue += amount
          } else if (t.type === "expense") {
            const isFOT =
              t.category?.toLowerCase().includes("fot") ||
              t.category?.toLowerCase().includes("зарплат") ||
              ["fot_animators", "fot_hosts", "fot_djs", "fot_admin"].includes(t.category)

            if (isFOT) {
              payroll += amount
            } else {
              expenses += amount
            }
          }
        })
      }

      setMetrics({ revenue, expenses, payroll })
    } catch (error) {
      console.error("Error loading metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadGamesRequiringAssignment = async () => {
    if (!user?.franchiseeId) return

    try {
      const response = await fetch(`/api/game-schedule?franchiseeId=${user.franchiseeId}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        const schedules = data.data || data || []

        const needsAssignment = schedules.filter((game: any) => {
          const animatorsNeeded = game.animatorsNeeded || game.animatorsCount || 0
          const hostsNeeded = game.hostsNeeded || game.hostsCount || 0
          const djsNeeded = game.djsNeeded || game.djsCount || 0
          const staffAssigned = (game.staff || game.assignedStaff || []).length
          const totalNeeded = animatorsNeeded + hostsNeeded + djsNeeded

          return totalNeeded > staffAssigned
        })

        setGamesRequiringAssignment(needsAssignment)
      }
    } catch (error) {
      console.error("Error loading games:", error)
    }
  }

  const loadPipeline = async () => {
    if (!user?.franchiseeId) return

    try {
      const response = await fetch(`/api/game-pipelines?franchiseeId=${user.franchiseeId}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        const pipelines = data.data || data || []
        if (pipelines.length > 0) {
          setPipeline(pipelines[0])
        }
      }
    } catch (error) {
      console.error("Error loading pipeline:", error)
    }
  }

  const handleTransactionCreated = async () => {
    setShowTransactionForm(false)
    await loadMetrics()
  }

  const handleGameCreated = async (game: any) => {
    setShowGameModal(false)
    await loadGamesRequiringAssignment()

    if (game.id) {
      router.push(`/crm?dealId=${game.id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка данных...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Оперативный Кабинет</h1>
        <p className="text-muted-foreground">Администратор: {user?.name}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Общая Выручка</p>
              <p className="text-3xl font-bold text-foreground">{metrics.revenue.toLocaleString()} ₽</p>
            </div>
            <DollarSign size={24} className="text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">За текущий период</p>
        </div>

        {/* Expenses */}
        <div className="bg-card border border-orange-500/20 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Общие Расходы</p>
              <p className="text-3xl font-bold text-orange-500">{metrics.expenses.toLocaleString()} ₽</p>
            </div>
            <TrendingDown size={24} className="text-orange-500" />
          </div>
          <p className="text-xs text-muted-foreground">За текущий период</p>
        </div>

        {/* Payroll */}
        <div className="bg-card border border-orange-500/20 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Начисленный ФОТ</p>
              <p className="text-3xl font-bold text-orange-500">{metrics.payroll.toLocaleString()} ₽</p>
            </div>
            <Users size={24} className="text-orange-500" />
          </div>
          <p className="text-xs text-muted-foreground">За текущий период</p>
        </div>
      </div>

      {/* Operational Bridge - CTA Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setShowTransactionForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white rounded-lg p-6 flex items-center justify-center gap-3 text-lg font-semibold transition-colors"
        >
          <Plus size={24} />
          Добавить Транзакцию
        </button>
        <button
          onClick={() => setShowGameModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-6 flex items-center justify-center gap-3 text-lg font-semibold transition-colors"
        >
          <Plus size={24} />
          Добавить Лид
        </button>
      </div>

      {showTransactionForm && (
        <TransactionFormModal
          onClose={() => setShowTransactionForm(false)}
          onSubmit={handleTransactionCreated}
          defaultType="expense"
        />
      )}

      {showGameModal && pipeline && (
        <GameCreateModal
          isOpen={showGameModal}
          onClose={() => setShowGameModal(false)}
          onCreated={handleGameCreated}
          pipeline={pipeline}
          franchiseeId={user?.franchiseeId}
        />
      )}

      {/* Requires Assignment Widget */}
      <div className="bg-card border border-destructive/30 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-destructive" />
          <h3 className="text-lg font-semibold text-foreground">Требуется Назначение</h3>
          <span className="ml-auto bg-destructive/20 text-destructive px-3 py-1 rounded-full text-sm font-medium">
            {gamesRequiringAssignment.length}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Ближайшие игры без полного состава персонала</p>

        {gamesRequiringAssignment.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Все игры укомплектованы персоналом</div>
        ) : (
          <div className="space-y-2">
            {gamesRequiringAssignment.slice(0, 5).map((game) => (
              <a
                key={game.id}
                href="/personnel"
                className="block w-full bg-muted hover:bg-muted/80 border border-destructive/20 rounded-lg p-4 text-left transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{game.clientName || "Без названия"}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {game.gameDate
                        ? new Date(game.gameDate).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Дата не указана"}
                    </p>
                  </div>
                  <span className="bg-destructive/20 text-destructive px-2 py-1 rounded text-xs font-medium">
                    Не назначен персонал
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
