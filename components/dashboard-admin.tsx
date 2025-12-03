"use client"

import { DollarSign, TrendingDown, Users, AlertTriangle, Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { DealCreateModal } from "./deal-create-modal"

export function DashboardAdmin() {
  const { user } = useAuth()
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showDealModal, setShowDealModal] = useState(false)

  // Mock data for operational metrics
  const metrics = {
    revenue: 450000,
    expenses: 120000,
    payroll: 85000,
  }

  // Mock games requiring staff assignment
  const gamesRequiringAssignment = [
    { id: 1, date: "2025-01-15", time: "14:00", client: "ООО Рога и Копыта", missing: 2 },
    { id: 2, date: "2025-01-16", time: "18:00", client: "День рождения Василия", missing: 1 },
    { id: 3, date: "2025-01-17", time: "16:00", client: "Корпоратив Яндекс", missing: 3 },
    { id: 4, date: "2025-01-18", time: "19:00", client: "Семья Ивановых", missing: 1 },
    { id: 5, date: "2025-01-19", time: "15:00", client: "ИП Петров", missing: 2 },
  ]

  const handleCreateDeal = (deal: any) => {
    console.log("[v0] Admin created new lead:", deal)
    // TODO: API integration to create deal
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Оперативный Кабинет</h1>
        <p className="text-muted-foreground">Администратор: {user.franchiseeName}</p>
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
          <p className="text-xs text-muted-foreground">За текущий месяц</p>
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
          <p className="text-xs text-muted-foreground">За текущий месяц</p>
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
          <p className="text-xs text-muted-foreground">За текущий месяц</p>
        </div>
      </div>

      {/* Operational Bridge - CTA Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setShowExpenseForm(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg p-6 flex items-center justify-center gap-3 text-lg font-semibold transition-colors"
        >
          <Plus size={24} />
          Ввести Расход
        </button>
        <button
          onClick={() => setShowDealModal(true)}
          className="bg-success hover:bg-success/90 text-white rounded-lg p-6 flex items-center justify-center gap-3 text-lg font-semibold transition-colors"
        >
          <Plus size={24} />
          Добавить лид
        </button>
      </div>

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-semibold text-foreground mb-4">Новый расход</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Дата</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Категория</label>
                <select className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>Аренда</option>
                  <option>Реквизит</option>
                  <option>Маркетинг</option>
                  <option>Коммунальные услуги</option>
                  <option>Прочее</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Сумма (₽)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Описание</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                  placeholder="Детали расхода"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Сохранить
              </button>
              <button
                onClick={() => setShowExpenseForm(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deal Create Modal */}
      <DealCreateModal
        isOpen={showDealModal}
        onClose={() => setShowDealModal(false)}
        onCreate={handleCreateDeal}
        role="admin"
      />

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

        <div className="space-y-2">
          {gamesRequiringAssignment.map((game) => (
            <button
              key={game.id}
              className="w-full bg-muted hover:bg-muted/80 border border-destructive/20 rounded-lg p-4 text-left transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{game.client}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {game.date} в {game.time}
                  </p>
                </div>
                <span className="bg-destructive/20 text-destructive px-2 py-1 rounded text-xs font-medium">
                  Не хватает: {game.missing}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
