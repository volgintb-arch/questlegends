"use client"

import type React from "react"
import { UKKPIManagement } from "./uk-kpi-management"

import { useState } from "react"
import { DollarSign, TrendingUp, Users, Settings, Trophy, BarChart3, Send } from "lucide-react"
import { MetricCard } from "./metric-card"
import { KPISettingsModal } from "./kpi-settings-modal"
import { TransactionTable } from "./transaction-table"

interface KPIData {
  id: string
  name: string
  value: string
  target: number
  unit: string
  weight: number
  trend: { value: number; isPositive: boolean }
  icon: React.ReactNode
  visible: boolean
}

interface FranchiseData {
  id: string
  name: string
  location: string
  revenue: number
  royalties: number
  expenses: number
  profit: number
}

export function DashboardUK() {
  const [showKPISettings, setShowKPISettings] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedFranchisee, setSelectedFranchisee] = useState("")
  const [messageText, setMessageText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [sendSuccess, setSendSuccess] = useState("")

  const franchiseData: FranchiseData[] = [
    {
      id: "F-001",
      name: "Москва-Юг",
      location: "Москва",
      revenue: 450000, // Выручка с мин.чеком
      royalties: 31500, // 7% от выручки
      expenses: 120000, // ФОТ
      profit: 298500, // revenue - royalties - expenses
    },
    {
      id: "F-002",
      name: "СПб-Север",
      location: "Санкт-Петербург",
      revenue: 380000,
      royalties: 26600,
      expenses: 95000,
      profit: 258400,
    },
    {
      id: "F-003",
      name: "Казань",
      location: "Казань",
      revenue: 320000,
      royalties: 22400,
      expenses: 85000,
      profit: 212600,
    },
    {
      id: "F-004",
      name: "Екатеринбург",
      location: "Екатеринбург",
      revenue: 290000,
      royalties: 20300,
      expenses: 75000,
      profit: 194700,
    },
    {
      id: "F-005",
      name: "Новосибирск",
      location: "Новосибирск",
      revenue: 250000,
      royalties: 17500,
      expenses: 65000,
      profit: 167500,
    },
  ]

  const bestFranchisee = franchiseData.reduce((prev, current) => (prev.revenue > current.revenue ? prev : current))

  const [kpiData, setKpiData] = useState<KPIData[]>([
    {
      id: "1",
      name: "Общая Выручка Сети",
      value: `${(franchiseData.reduce((sum, f) => sum + f.revenue, 0) / 1000).toFixed(0)}K ₽`,
      target: 3000000,
      unit: "₽",
      weight: 30,
      trend: { value: 12.5, isPositive: true },
      icon: <DollarSign className="w-5 h-5" />,
      visible: true,
    },
    {
      id: "2",
      name: "Сводное Роялти",
      value: `${(franchiseData.reduce((sum, f) => sum + f.royalties, 0) / 1000).toFixed(0)}K ₽`,
      target: 210000,
      unit: "₽",
      weight: 20,
      trend: { value: 8.2, isPositive: true },
      icon: <TrendingUp className="w-5 h-5" />,
      visible: true,
    },
    {
      id: "3",
      name: "Средний Чек",
      value: `${(franchiseData.reduce((sum, f) => sum + f.revenue, 0) / franchiseData.length / 1000).toFixed(1)}K ₽`,
      target: 30000,
      unit: "₽",
      weight: 15,
      trend: { value: 5.1, isPositive: true },
      icon: <BarChart3 className="w-5 h-5" />,
      visible: true,
    },
    {
      id: "4",
      name: "Количество Игр",
      value: "100",
      target: 120,
      unit: "игр",
      weight: 10,
      trend: { value: 15, isPositive: true },
      icon: <Users className="w-5 h-5" />,
      visible: true,
    },
    {
      id: "6",
      name: "Лучший Франчайзи",
      value: `${bestFranchisee.name} (${bestFranchisee.location})`,
      target: 0,
      unit: "",
      weight: 0,
      trend: { value: 0, isPositive: true },
      icon: <Trophy className="w-5 h-5" />,
      visible: false,
    },
  ])

  const recentTransactions = [
    { id: "1", name: "Оплата от Франчайзи №5", amount: "+45,000 ₽", status: "completed" as const, date: "2025-11-26" },
    { id: "2", name: "Выплата роялти сети", amount: "-35,500 ₽", status: "completed" as const, date: "2025-11-25" },
    { id: "3", name: "Депозит нового франчайзи", amount: "+50,000 ₽", status: "pending" as const, date: "2025-11-24" },
    { id: "4", name: "Возврат залога", amount: "-25,000 ₽", status: "failed" as const, date: "2025-11-23" },
  ]

  const handleSaveKPIs = (newKPISettings: any) => {
    setKpiData(
      kpiData.map((kpi) => ({
        ...kpi,
        visible: newKPISettings.find((s: any) => s.id === kpi.id)?.visible ?? kpi.visible,
      })),
    )
  }

  const visibleKPIs = kpiData.filter((kpi) => kpi.visible)

  const handleSendMessage = async () => {
    if (!selectedFranchisee || !messageText.trim()) return

    setIsSending(true)
    setSendError("")
    setSendSuccess("")

    try {
      const response = await fetch("/api/telegram/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          franchiseeId: selectedFranchisee,
          message: messageText.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to send message")
      }

      setSendSuccess(`Сообщение отправлено в Telegram пользователю ${data.recipient}`)
      setMessageText("")

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowMessageModal(false)
        setSelectedFranchisee("")
        setSendSuccess("")
      }, 2000)
    } catch (error) {
      console.error("[v0] Error sending Telegram message:", error)
      setSendError(error instanceof Error ? error.message : "Не удалось отправить сообщение")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <UKKPIManagement />

      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Отправить сообщение франчайзи</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
          Отправьте сообщение франчайзи в Telegram - получатель должен настроить Telegram ID в профиле
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedFranchisee}
            onChange={(e) => setSelectedFranchisee(e.target.value)}
            className="flex-1 bg-muted border border-border rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm outline-none focus:border-primary"
          >
            <option value="">Выберите франчайзи...</option>
            {franchiseData.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} - {f.location}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowMessageModal(true)}
            disabled={!selectedFranchisee}
            className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Send size={16} />
            Написать
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Ключевые Показатели</h2>
          <button
            onClick={() => setShowKPISettings(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-muted/50 hover:bg-muted text-muted-foreground text-xs font-medium rounded transition-colors"
          >
            <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Настройки</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {visibleKPIs.map((metric) => (
            <MetricCard
              key={metric.id}
              title={metric.name}
              value={metric.value}
              trend={metric.trend}
              icon={metric.icon}
            />
          ))}
        </div>
      </div>

      {visibleKPIs.some((kpi) => kpi.id === "6") && (
        <div className="rounded-lg bg-card border border-border p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              Финансовое состояние: {bestFranchisee.name}
            </h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Выручка с мин.чеком</p>
              <p className="text-xl font-bold text-blue-500">{(bestFranchisee.revenue / 1000).toFixed(0)}K ₽</p>
              <p className="text-xs text-muted-foreground mt-1">{bestFranchisee.location}</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Роялти (7%)</p>
              <p className="text-xl font-bold text-green-500">{(bestFranchisee.royalties / 1000).toFixed(1)}K ₽</p>
              <p className="text-xs text-muted-foreground mt-1">от выручки</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-2">ФОТ</p>
              <p className="text-xl font-bold text-orange-500">{(bestFranchisee.expenses / 1000).toFixed(0)}K ₽</p>
              <p className="text-xs text-muted-foreground mt-1">расходы</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Чистая Прибыль</p>
              <p className="text-xl font-bold text-green-600">{(bestFranchisee.profit / 1000).toFixed(1)}K ₽</p>
              <p className="text-xs text-muted-foreground mt-1">выр-роял-фот</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <TransactionTable transactions={recentTransactions} title="Недавние Транзакции" />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-card border border-border p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-4">Статистика Сети</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Средний Рейтинг</p>
                <p className="text-2xl font-bold text-foreground">4.8/5.0</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-1">Уровень Удовлетворения</p>
                <p className="text-2xl font-bold text-green-500">92%</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-1">Выполнение Плана</p>
                <p className="text-2xl font-bold text-blue-500">107%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <KPISettingsModal
        isOpen={showKPISettings}
        onClose={() => setShowKPISettings(false)}
        onSave={handleSaveKPIs}
        currentKPIs={kpiData.map((k) => ({ id: k.id, name: k.name, visible: k.visible }))}
      />

      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
              Отправить сообщение в Telegram: {franchiseData.find((f) => f.id === selectedFranchisee)?.name}
            </h3>

            {sendSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm">
                {sendSuccess}
              </div>
            )}

            {sendError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm">
                {sendError}
              </div>
            )}

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Введите ваше сообщение или комментарий..."
              rows={5}
              disabled={isSending}
              className="w-full bg-muted border border-border rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-primary resize-none disabled:opacity-50"
            />
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-3 sm:mt-4">
              <button
                onClick={() => {
                  setShowMessageModal(false)
                  setMessageText("")
                  setSendError("")
                  setSendSuccess("")
                }}
                disabled={isSending}
                className="w-full sm:w-auto px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || isSending}
                className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Отправить в Telegram
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
