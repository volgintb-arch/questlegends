"use client"

import { useState } from "react"
import { DollarSign, TrendingUp, TrendingDown, Download, Users, Plus, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useExpenses, useCreateExpense } from "@/hooks/use-expenses"
import { useTransactions } from "@/hooks/use-transactions"

const EXPENSE_CATEGORIES = [
  "Аренда",
  "Коммунальные услуги",
  "Маркетинг",
  "Оборудование",
  "Хозяйственные",
  "Зарплата/ФОТ",
  "Прочее",
]

export function FinancesFranchisee() {
  const { user } = useAuth()
  const [dateFilter, setDateFilter] = useState("current-month")
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [newExpense, setNewExpense] = useState({
    category: "Аренда",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  })

  const { data: expensesData, isLoading: expensesLoading } = useExpenses()
  const { data: transactionsData } = useTransactions()
  const createExpenseMutation = useCreateExpense()

  const expenses = expensesData || []
  const transactions = transactionsData || []

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Calculate P&L data from real transactions
  const revenue = transactions.reduce((sum, t) => sum + t.revenue, 0)
  const royalty = transactions.reduce((sum, t) => sum + t.royalty, 0)
  const fot = transactions.reduce((sum, t) => sum + t.fot, 0)
  const netProfit = revenue - royalty - fot - totalExpenses

  const handleCreateExpense = async () => {
    if (!newExpense.amount || !newExpense.date) {
      alert("Пожалуйста, заполните все обязательные поля")
      return
    }

    try {
      await createExpenseMutation.mutateAsync({
        category: newExpense.category,
        amount: Number.parseInt(newExpense.amount),
        date: new Date(newExpense.date),
        description: newExpense.description || undefined,
      })

      // Reset form
      setNewExpense({
        category: "Аренда",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
      })
      setShowExpenseForm(false)
    } catch (error) {
      console.error("Failed to create expense:", error)
      alert("Ошибка при создании расхода")
    }
  }

  const plData = [
    { month: "Июль", revenue: 380000, expenses: 52000 },
    { month: "Август", revenue: 395000, expenses: 54000 },
    { month: "Сентябрь", revenue: 410000, expenses: 51000 },
    { month: "Октябрь", revenue: 418000, expenses: 53000 },
    { month: "Ноябрь", revenue: revenue, expenses: totalExpenses },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Финансы / Расходы & Отчеты</h1>
          <p className="text-sm text-muted-foreground mt-1">Анализ расходов и P&L отчет</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors">
          <Download size={18} />
          <span className="text-sm">Экспорт отчета</span>
        </button>
      </div>

      {/* P&L Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <p className="text-xs text-muted-foreground">Выручка</p>
          </div>
          <p className="text-xl font-bold text-foreground">{revenue.toLocaleString("ru-RU")} ₽</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-xs text-muted-foreground">Расходы</p>
          </div>
          <p className="text-xl font-bold text-foreground">{totalExpenses.toLocaleString("ru-RU")} ₽</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-yellow-500" />
            <p className="text-xs text-muted-foreground">ФОТ</p>
          </div>
          <p className="text-xl font-bold text-foreground">{fot.toLocaleString("ru-RU")} ₽</p>
        </div>

        <div className="bg-card border border-primary rounded-lg p-4 border-2">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">Чистая Прибыль</p>
          </div>
          <p className="text-xl font-bold text-primary">{netProfit.toLocaleString("ru-RU")} ₽</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground">Общие Расходы</h2>
          <div className="flex items-center gap-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="current-month">Текущий месяц</option>
              <option value="last-month">Прошлый месяц</option>
              <option value="quarter">Квартал</option>
            </select>
            <button
              onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm"
            >
              <Plus size={16} />
              Добавить расход
            </button>
          </div>
        </div>

        {showExpenseForm && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold text-foreground">Новый расход</h3>
              <button
                onClick={() => setShowExpenseForm(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Категория <span className="text-red-500">*</span>
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Дата <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Сумма (₽) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Описание</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Детали расхода"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCreateExpense}
                disabled={createExpenseMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createExpenseMutation.isPending ? "Сохранение..." : "Сохранить"}
              </button>
              <button
                onClick={() => setShowExpenseForm(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Дата</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Категория</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Описание</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {expensesLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    Загрузка расходов...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    Расходов пока нет. Добавьте первый расход.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4 text-sm text-foreground">
                      {new Date(expense.date).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">{expense.category}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{expense.description || "—"}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-foreground">
                      {expense.amount.toLocaleString("ru-RU")} ₽
                    </td>
                  </tr>
                ))
              )}
              {!expensesLoading && expenses.length > 0 && (
                <tr className="bg-muted/50">
                  <td colSpan={3} className="py-3 px-4 text-sm font-semibold text-foreground">
                    ИТОГО
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-bold text-primary">
                    {totalExpenses.toLocaleString("ru-RU")} ₽
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* P&L Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">P&L Отчет (Динамика)</h2>
        <p className="text-xs text-muted-foreground mb-6">Выручка vs Расходы за последние 5 месяцев</p>

        <div className="space-y-4">
          {plData.map((item, idx) => {
            const profit = item.revenue - item.expenses
            const maxValue = Math.max(...plData.map((d) => d.revenue))

            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium w-24">{item.month}</span>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-500">↑ {item.revenue.toLocaleString("ru-RU")} ₽</span>
                    <span className="text-red-500">↓ {item.expenses.toLocaleString("ru-RU")} ₽</span>
                    <span className="text-primary font-semibold">= {profit.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>
                <div className="flex gap-1 h-8">
                  <div
                    className="bg-green-500/30 rounded-l flex items-center justify-end pr-2 text-xs text-green-500 font-semibold"
                    style={{ width: `${(item.revenue / maxValue) * 100}%` }}
                  />
                  <div
                    className="bg-red-500/30 rounded-r flex items-center justify-start pl-2 text-xs text-red-500 font-semibold"
                    style={{ width: `${(item.expenses / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
