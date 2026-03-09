"use client"

import { useState, useEffect } from "react"
import { RussianRuble, TrendingUp, TrendingDown, Download, Users, Plus, X, Building2, Calendar, Percent, ShoppingBag } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useExpenses, useCreateExpense } from "@/hooks/use-expenses"
import { useTransactions, useCreateTransaction } from "@/hooks/use-transactions"

const EXPENSE_CATEGORIES = [
  "Аренда",
  "Коммунальные услуги",
  "Маркетинг",
  "Оборудование",
  "Хозяйственные",
  "Зарплата/ФОТ",
  "Прочее",
]

interface FranchiseeInfo {
  id: string
  name: string
  royaltyPercent: number
  royaltyPaymentDay: number | null
}

export function FinancesFranchisee() {
  const { user, hasPermission, getAuthHeaders } = useAuth()
  const [dateFilter, setDateFilter] = useState("current-month")
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showExtrasForm, setShowExtrasForm] = useState(false)
  const [isCreatingExtras, setIsCreatingExtras] = useState(false)
  const [newExtras, setNewExtras] = useState({
    name: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  })
  const [franchiseeInfo, setFranchiseeInfo] = useState<FranchiseeInfo | null>(null)
  const [newExpense, setNewExpense] = useState({
    category: "Аренда",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  })

  const { data: expensesData, isLoading: expensesLoading } = useExpenses()
  const { data: transactionsData } = useTransactions()
  const createExpenseMutation = useCreateExpense()
  const createTransactionMutation = useCreateTransaction()

  const expenses = (expensesData || []) as any[]
  const transactions = (transactionsData || []) as any[]

  // Load franchisee info for royalty
  useEffect(() => {
    if (!user?.franchiseeId) return
    const loadInfo = async () => {
      try {
        const res = await fetch(`/api/franchisees/${user.franchiseeId}`, { headers: getAuthHeaders() })
        if (res.ok) {
          const data = await res.json()
          setFranchiseeInfo(data.data || data)
        }
      } catch (err) {
        console.error("Failed to load franchisee info:", err)
      }
    }
    loadInfo()
  }, [user?.franchiseeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)

  // Revenue = income transactions (game postpayments, prepayments) + old deal transactions
  const revenue = transactions.reduce((sum: number, t: any) => {
    if (t.type === "income") return sum + (Number(t.amount) || 0)
    if (!t.type && !t.category) return sum + (Number(t.amount) || 0)
    return sum
  }, 0)

  // FOT = expense transactions with category 'fot'
  const fot = transactions
    .filter((t: any) => t.type === "expense" && t.category === "fot")
    .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

  // Extras = income transactions with category 'extras'
  const extrasTransactions = transactions.filter((t: any) => t.type === "income" && t.category === "extras")
  const extrasTotal = extrasTransactions.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

  const isOwnPoint = user?.role === "own_point" || hasPermission("noRoyalty")

  // Auto-calculate royalty from revenue * royaltyPercent
  const royaltyPercent = franchiseeInfo?.royaltyPercent ?? 10
  const royaltyFromTransactions = transactions.reduce((sum: number, t: any) => sum + (Number(t.royaltyAmount) || 0), 0)
  const royaltyCalculated = Math.round(revenue * royaltyPercent / 100)
  const royalty = isOwnPoint ? 0 : Math.max(royaltyFromTransactions, royaltyCalculated)

  const netProfit = revenue - royalty - fot - totalExpenses

  // Royalty payment date
  const royaltyPaymentDay = franchiseeInfo?.royaltyPaymentDay || 10
  const now = new Date()
  const nextRoyaltyDate = new Date(now.getFullYear(), now.getMonth(), royaltyPaymentDay)
  if (nextRoyaltyDate <= now) {
    nextRoyaltyDate.setMonth(nextRoyaltyDate.getMonth() + 1)
  }

  // Group transactions and expenses by month for chart
  const monthlyData = new Map<string, { revenue: number; expenses: number; fot: number }>()

  transactions.forEach((t: any) => {
    const txDate = t.date || t.paymentDate || t.createdAt
    if (!txDate) return
    const date = new Date(txDate)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const existing = monthlyData.get(monthKey) || { revenue: 0, expenses: 0, fot: 0 }
    const amt = Number(t.amount) || 0
    if (t.type === "income" || (!t.type && !t.category)) {
      monthlyData.set(monthKey, { ...existing, revenue: existing.revenue + amt })
    } else if (t.type === "expense" && t.category === "fot") {
      monthlyData.set(monthKey, { ...existing, fot: existing.fot + amt })
    } else if (t.type === "expense") {
      monthlyData.set(monthKey, { ...existing, expenses: existing.expenses + amt })
    }
  })

  expenses.forEach((e: any) => {
    const date = new Date(e.date || e.expenseDate || e.createdAt)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const existing = monthlyData.get(monthKey) || { revenue: 0, expenses: 0, fot: 0 }
    monthlyData.set(monthKey, { ...existing, expenses: existing.expenses + (Number(e.amount) || 0) })
  })

  const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
  const plData = Array.from(monthlyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-5)
    .map(([key, data]) => {
      const [, month] = key.split("-")
      const monthIndex = Number.parseInt(month) - 1
      const monthRevenue = data.revenue
      const monthRoyalty = isOwnPoint ? 0 : Math.round(monthRevenue * royaltyPercent / 100)
      return {
        month: monthNames[monthIndex],
        revenue: monthRevenue,
        expenses: data.expenses,
        fot: data.fot,
        royalty: monthRoyalty,
        profit: monthRevenue - data.expenses - data.fot - monthRoyalty,
      }
    })

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

  const handleCreateExtras = async () => {
    if (!newExtras.name || !newExtras.amount) {
      alert("Укажите название и сумму допродажи")
      return
    }

    setIsCreatingExtras(true)
    try {
      await createTransactionMutation.mutateAsync({
        type: "income",
        category: "extras",
        description: "Допродажа: " + newExtras.name,
        amount: Number(newExtras.amount),
        date: newExtras.date,
        franchiseeId: user?.franchiseeId,
      } as any)

      setNewExtras({ name: "", amount: "", date: new Date().toISOString().split("T")[0] })
      setShowExtrasForm(false)
    } catch (error) {
      console.error("Failed to create extras:", error)
      alert("Ошибка при создании допродажи")
    } finally {
      setIsCreatingExtras(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx")

      // Sheet 1: Summary
      const summaryData = [
        ["Финансовый отчет", franchiseeInfo?.name || ""],
        ["Дата формирования", new Date().toLocaleDateString("ru-RU")],
        [],
        ["Ключевые показатели", "Сумма (₽)"],
        ["Выручка", revenue],
        ["  в т.ч. допродажи", extrasTotal],
        ["Расходы", totalExpenses],
        ["ФОТ (персонал)", fot],
        ...(isOwnPoint ? [] : [["Роялти (" + royaltyPercent + "%)", royalty]]),
        ["Чистая прибыль", netProfit],
        [],
        ["Рентабельность", revenue > 0 ? Math.round((netProfit / revenue) * 100) + "%" : "—"],
        ["Средний чек игры", transactions.filter((t: any) => t.type === "income" && t.category === "postpayment").length > 0
          ? Math.round(transactions.filter((t: any) => t.type === "income" && t.category === "postpayment").reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0) / transactions.filter((t: any) => t.type === "income" && t.category === "postpayment").length)
          : "—"],
        ...(isOwnPoint ? [] : [
          [],
          ["Роялти", ""],
          ["Ставка роялти", royaltyPercent + "%"],
          ["Дата отчисления", royaltyPaymentDay + " числа каждого месяца"],
          ["Следующая оплата", nextRoyaltyDate.toLocaleDateString("ru-RU")],
          ["Сумма к оплате", royalty],
        ]),
      ]

      // Sheet 2: Monthly P&L
      const monthlyHeaders = isOwnPoint
        ? ["Месяц", "Выручка", "Расходы", "ФОТ", "Прибыль"]
        : ["Месяц", "Выручка", "Расходы", "ФОТ", "Роялти", "Прибыль"]
      const monthlyRows = plData.map((d) =>
        isOwnPoint
          ? [d.month, d.revenue, d.expenses, d.fot, d.profit]
          : [d.month, d.revenue, d.expenses, d.fot, d.royalty, d.profit]
      )

      // Sheet 3: Expenses detail
      const expenseHeaders = ["Дата", "Категория", "Описание", "Сумма (₽)"]
      const expenseRows = expenses.map((e: any) => [
        new Date(e.date || e.expenseDate || e.createdAt).toLocaleDateString("ru-RU"),
        e.category || "—",
        e.description || "—",
        Number(e.amount) || 0,
      ])

      // Sheet 4: Transactions detail
      const txHeaders = ["Дата", "Тип", "Категория", "Описание", "Сумма (₽)"]
      const txRows = transactions.map((t: any) => [
        new Date(t.date || t.paymentDate || t.createdAt).toLocaleDateString("ru-RU"),
        t.type === "income" ? "Доход" : t.type === "expense" ? "Расход" : "Доход",
        t.category === "prepayment" ? "Предоплата" : t.category === "postpayment" ? "Постоплата" : t.category === "fot" ? "ФОТ" : t.category === "extras" ? "Допродажа" : t.dealTitle || "Сделка",
        t.description || t.notes || t.dealTitle || "—",
        Number(t.amount) || 0,
      ])

      const wb = XLSX.utils.book_new()

      const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
      ws1["!cols"] = [{ wch: 30 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, ws1, "Сводка")

      const ws2 = XLSX.utils.aoa_to_sheet([monthlyHeaders, ...monthlyRows])
      ws2["!cols"] = monthlyHeaders.map(() => ({ wch: 15 }))
      XLSX.utils.book_append_sheet(wb, ws2, "P&L по месяцам")

      const ws3 = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseRows])
      ws3["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, ws3, "Расходы")

      if (txRows.length > 0) {
        const ws4 = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows])
        ws4["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 35 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(wb, ws4, "Транзакции")
      }

      // Sheet 5: Extras detail
      if (extrasTransactions.length > 0) {
        const extrasHeaders = ["Дата", "Название", "Сумма (₽)"]
        const extrasRows = extrasTransactions.map((t: any) => [
          new Date(t.date || t.createdAt).toLocaleDateString("ru-RU"),
          t.description || "Допродажа",
          Number(t.amount) || 0,
        ])
        extrasRows.push(["", "ИТОГО", extrasTotal])
        const ws5 = XLSX.utils.aoa_to_sheet([extrasHeaders, ...extrasRows])
        ws5["!cols"] = [{ wch: 15 }, { wch: 40 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(wb, ws5, "Допродажи")
      }

      const dateStr = new Date().toISOString().split("T")[0]
      XLSX.writeFile(wb, `Финансовый_отчет_${dateStr}.xlsx`)
    } catch (error) {
      console.error("Export error:", error)
      alert("Ошибка при экспорте отчёта")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Финансы / Расходы & Отчеты</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Анализ расходов и P&L отчет
            {isOwnPoint && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary">
                <Building2 className="w-3 h-3" />
                Собственная точка (без роялти)
              </span>
            )}
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
        >
          <Download size={18} />
          <span className="text-sm">Экспорт отчета</span>
        </button>
      </div>

      {/* P&L Summary Cards */}
      <div className={`grid grid-cols-1 gap-4 ${isOwnPoint ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <RussianRuble className="w-4 h-4 text-green-500" />
            <p className="text-xs text-muted-foreground">Выручка</p>
          </div>
          <p className="text-xl font-bold text-foreground">{revenue.toLocaleString("ru-RU")} ₽</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-xs text-muted-foreground">Расходы + ФОТ</p>
          </div>
          <p className="text-xl font-bold text-foreground">{(totalExpenses + fot).toLocaleString("ru-RU")} ₽</p>
          {fot > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Расходы: {totalExpenses.toLocaleString("ru-RU")} ₽ / ФОТ: {fot.toLocaleString("ru-RU")} ₽
            </p>
          )}
        </div>

        {!isOwnPoint && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-yellow-500" />
              <p className="text-xs text-muted-foreground">Роялти ({royaltyPercent}%)</p>
            </div>
            <p className="text-xl font-bold text-foreground">{royalty.toLocaleString("ru-RU")} ₽</p>
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Оплата {royaltyPaymentDay}-го числа / след: {nextRoyaltyDate.toLocaleDateString("ru-RU")}
              </p>
            </div>
          </div>
        )}

        <div className="bg-card border border-primary rounded-lg p-4 border-2">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">Чистая Прибыль</p>
          </div>
          <p className={`text-xl font-bold ${netProfit >= 0 ? "text-primary" : "text-red-500"}`}>
            {netProfit.toLocaleString("ru-RU")} ₽
          </p>
          {revenue > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Рентабельность: {Math.round((netProfit / revenue) * 100)}%
            </p>
          )}
        </div>
      </div>

      {/* Extras Summary */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="w-5 h-5 text-orange-500" />
          <h2 className="text-sm font-semibold text-foreground">Допродажи</h2>
          {extrasTransactions.length > 0 && (
            <span className="text-xs text-muted-foreground">({extrasTransactions.length} шт.)</span>
          )}
          <span className="ml-auto flex items-center gap-3">
            {extrasTotal > 0 && (
              <span className="text-lg font-bold text-orange-500">{extrasTotal.toLocaleString("ru-RU")} ₽</span>
            )}
            <button
              onClick={() => setShowExtrasForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-xs"
            >
              <Plus size={14} />
              Доп продажа
            </button>
          </span>
        </div>

        {showExtrasForm && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Новая допродажа</h3>
              <button onClick={() => setShowExtrasForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newExtras.name}
                  onChange={(e) => setNewExtras({ ...newExtras, name: e.target.value })}
                  placeholder="Фотозона, торт..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Сумма (₽) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={newExtras.amount}
                  onChange={(e) => setNewExtras({ ...newExtras, amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Дата</label>
                <input
                  type="date"
                  value={newExtras.date}
                  onChange={(e) => setNewExtras({ ...newExtras, date: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreateExtras}
                disabled={isCreatingExtras}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm disabled:opacity-50"
              >
                {isCreatingExtras ? "Сохранение..." : "Добавить"}
              </button>
              <button
                onClick={() => setShowExtrasForm(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {extrasTransactions.length > 0 ? (
          <div className="space-y-1">
            {extrasTransactions.map((t: any) => (
              <div key={t.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border/30 last:border-0">
                <span className="text-muted-foreground">
                  {new Date(t.date || t.createdAt).toLocaleDateString("ru-RU")} — {t.description || "Допродажа"}
                </span>
                <span className="font-medium text-foreground">{(Number(t.amount) || 0).toLocaleString("ru-RU")} ₽</span>
              </div>
            ))}
          </div>
        ) : !showExtrasForm && (
          <p className="text-xs text-muted-foreground">Допродаж пока нет</p>
        )}
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
                expenses.map((expense: any) => (
                  <tr key={expense.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4 text-sm text-foreground">
                      {new Date(expense.date || expense.expenseDate || expense.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">{expense.category}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{expense.description || "—"}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-foreground">
                      {(Number(expense.amount) || 0).toLocaleString("ru-RU")} ₽
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
            const maxValue = Math.max(...plData.map((d) => Math.max(d.revenue, 1)))

            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium w-24">{item.month}</span>
                  <div className="flex gap-4 text-xs flex-wrap">
                    <span className="text-green-500">+{item.revenue.toLocaleString("ru-RU")} ₽</span>
                    <span className="text-red-500">-{(item.expenses + item.fot).toLocaleString("ru-RU")} ₽</span>
                    {!isOwnPoint && <span className="text-yellow-500">-{item.royalty.toLocaleString("ru-RU")} ₽</span>}
                    <span className={`font-semibold ${item.profit >= 0 ? "text-primary" : "text-red-500"}`}>
                      = {item.profit.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 h-8">
                  <div
                    className="bg-green-500/30 rounded-l"
                    style={{ width: `${(item.revenue / maxValue) * 100}%` }}
                  />
                  <div
                    className="bg-red-500/30 rounded-r"
                    style={{ width: `${((item.expenses + item.fot + item.royalty) / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
          {plData.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Нет данных для отображения</p>
          )}
        </div>
      </div>
    </div>
  )
}
