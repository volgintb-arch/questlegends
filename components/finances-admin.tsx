"use client"

import { useState } from "react"
import { Plus, Download, Users, TrendingDown } from "lucide-react"

interface Expense {
  id: number
  date: string
  category: string
  amount: number
  description: string
  receipt?: string
}

interface PayrollEntry {
  id: number
  employeeId: string
  employeeName: string
  period: string
  baseSalary: number
  bonus: number
  deductions: number
  total: number
}

export function FinancesAdmin() {
  const [activeTab, setActiveTab] = useState<"expenses" | "payroll">("expenses")
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showPayrollForm, setShowPayrollForm] = useState(false)

  // Mock expenses data
  const [expenses] = useState<Expense[]>([
    { id: 1, date: "2025-01-10", category: "Аренда", amount: 50000, description: "Аренда помещения за январь" },
    { id: 2, date: "2025-01-08", category: "Реквизит", amount: 15000, description: "Закупка реквизита для новой игры" },
    { id: 3, date: "2025-01-05", category: "Маркетинг", amount: 8000, description: "Таргетированная реклама" },
  ])

  // Mock payroll data
  const [payrollEntries] = useState<PayrollEntry[]>([
    {
      id: 1,
      employeeId: "EMP001",
      employeeName: "Иванов Иван",
      period: "Январь 2025",
      baseSalary: 40000,
      bonus: 5000,
      deductions: 0,
      total: 45000,
    },
    {
      id: 2,
      employeeId: "EMP002",
      employeeName: "Петрова Анна",
      period: "Январь 2025",
      baseSalary: 35000,
      bonus: 3000,
      deductions: 0,
      total: 38000,
    },
  ])

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const totalPayroll = payrollEntries.reduce((sum, entry) => sum + entry.total, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Финансы / Расходы & Отчеты</h1>
          <p className="text-muted-foreground">Управление операционными расходами и ФОТ</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Download size={18} />
          Экспорт
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-orange-500/20 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Всего Расходов</p>
              <p className="text-3xl font-bold text-orange-500">{totalExpenses.toLocaleString()} ₽</p>
            </div>
            <TrendingDown size={24} className="text-orange-500" />
          </div>
          <p className="text-xs text-muted-foreground">За текущий месяц</p>
        </div>

        <div className="bg-card border border-orange-500/20 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Начисленный ФОТ</p>
              <p className="text-3xl font-bold text-orange-500">{totalPayroll.toLocaleString()} ₽</p>
            </div>
            <Users size={24} className="text-orange-500" />
          </div>
          <p className="text-xs text-muted-foreground">За текущий месяц</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "expenses"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Расходы
        </button>
        <button
          onClick={() => setActiveTab("payroll")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "payroll"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Начисление ЗП
        </button>
      </div>

      {/* Expenses Tab */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">Список расходов</h3>
            <button
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Добавить расход
            </button>
          </div>

          {/* Expense Form */}
          {showExpenseForm && (
            <div className="bg-card border border-border rounded-lg p-6">
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
          )}

          {/* Expenses Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Категория
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Описание
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Сумма
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{expense.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">{expense.category}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{expense.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-500">
                        {expense.amount.toLocaleString()} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Tab */}
      {activeTab === "payroll" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">Начисление заработной платы</h3>
            <button
              onClick={() => setShowPayrollForm(!showPayrollForm)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Начислить ЗП
            </button>
          </div>

          {/* Payroll Form */}
          {showPayrollForm && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4">Начисление заработной платы</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Сотрудник</label>
                  <select className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                    <option>Иванов Иван (Аниматор)</option>
                    <option>Петрова Анна (Администратор)</option>
                    <option>Сидоров Петр (Ведущий)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Период</label>
                  <input
                    type="month"
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Базовая ставка (₽)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Премии (₽)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Вычеты (₽)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Начислить
                </button>
                <button
                  onClick={() => setShowPayrollForm(false)}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Payroll Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Сотрудник
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Период
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Оклад
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Премии
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Вычеты
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Итого
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payrollEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-foreground">{entry.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{entry.employeeId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{entry.period}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {entry.baseSalary.toLocaleString()} ₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-success">
                        {entry.bonus.toLocaleString()} ₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-destructive">
                        {entry.deductions.toLocaleString()} ₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {entry.total.toLocaleString()} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
