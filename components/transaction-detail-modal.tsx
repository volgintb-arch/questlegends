"use client"

import { X, Calendar, MapPin, Users, DollarSign, TrendingUp, Briefcase } from "lucide-react"

interface TransactionDetail {
  id: string
  amo_deal_id: string
  participants_N: number
  package_price_B: number
  location: string
  required_animators: number
  total_revenue: number
  royalty_amount: number
  fot_calculation: number
  date: string
  status: "completed" | "pending" | "failed"
}

interface TransactionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: TransactionDetail | null
}

export function TransactionDetailModal({ isOpen, onClose, transaction }: TransactionDetailModalProps) {
  if (!isOpen || !transaction) return null

  const netProfit = transaction.total_revenue - transaction.royalty_amount - transaction.fot_calculation

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Детали Транзакции</h2>
            <p className="text-sm text-muted-foreground">{transaction.id}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                transaction.status === "completed"
                  ? "bg-green-500/20 text-green-500"
                  : transaction.status === "pending"
                    ? "bg-yellow-500/20 text-yellow-500"
                    : "bg-red-500/20 text-red-500"
              }`}
            >
              {transaction.status === "completed"
                ? "Завершено"
                : transaction.status === "pending"
                  ? "Ожидание"
                  : "Ошибка"}
            </span>
          </div>

          {/* Input Data Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Входные Данные</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Briefcase size={18} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">ID Сделки</p>
                  <p className="text-sm font-medium text-foreground">{transaction.amo_deal_id}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin size={18} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Локация</p>
                  <p className="text-sm font-medium text-foreground">{transaction.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Users size={18} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Участников</p>
                  <p className="text-sm font-medium text-foreground">{transaction.participants_N}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <DollarSign size={18} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Цена Пакета</p>
                  <p className="text-sm font-medium text-foreground">
                    {transaction.package_price_B.toLocaleString()} ₽
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar size={18} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Дата</p>
                  <p className="text-sm font-medium text-foreground">{transaction.date}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Calculated Data Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Расчетные Данные</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400 mb-1">Требуется Аниматоров</p>
                <p className="text-2xl font-bold text-blue-500">{transaction.required_animators}</p>
                <p className="text-xs text-muted-foreground mt-1">⌈{transaction.participants_N} / 7⌉</p>
              </div>

              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-xs text-green-400 mb-1">Выручка</p>
                <p className="text-2xl font-bold text-green-500">{transaction.total_revenue.toLocaleString()} ₽</p>
                {transaction.package_price_B < 21000 && (
                  <p className="text-xs text-orange-400 mt-1">Применен мин. чек 21,000 ₽</p>
                )}
              </div>

              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p className="text-xs text-orange-400 mb-1">Роялти (7%)</p>
                <p className="text-2xl font-bold text-orange-500">{transaction.royalty_amount.toLocaleString()} ₽</p>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-xs text-purple-400 mb-1">ФОТ</p>
                <p className="text-2xl font-bold text-purple-500">{transaction.fot_calculation.toLocaleString()} ₽</p>
                <p className="text-xs text-muted-foreground mt-1">({transaction.required_animators} × 1300) + 2800</p>
              </div>
            </div>
          </div>

          {/* Net Profit */}
          <div className="p-6 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-green-500" />
                <span className="text-sm font-medium text-foreground">Чистая Прибыль</span>
              </div>
              <span className="text-3xl font-bold text-green-500">{netProfit.toLocaleString()} ₽</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Выручка - Роялти - ФОТ = {transaction.total_revenue.toLocaleString()} -{" "}
              {transaction.royalty_amount.toLocaleString()} - {transaction.fot_calculation.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
