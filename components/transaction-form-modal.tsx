"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Transaction {
  id?: string
  type: "income" | "expense"
  amount: number | string
  category: string
  description: string
  date: string
}

interface TransactionFormModalProps {
  onClose: () => void
  onSubmit: (transaction: any) => void
  defaultType?: "income" | "expense"
  transaction?: Transaction | null // For editing
}

export function TransactionFormModal({
  onClose,
  onSubmit,
  defaultType = "income",
  transaction,
}: TransactionFormModalProps) {
  const { user, getAuthHeaders } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: transaction?.type || defaultType,
    amount: transaction?.amount?.toString() || "",
    category: transaction?.category || "",
    description: transaction?.description || "",
    date: transaction?.date?.split("T")[0] || new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    if (!transaction) {
      setFormData((prev) => ({ ...prev, type: defaultType, category: "" }))
    }
  }, [defaultType, transaction])

  const incomeCategories = [
    { value: "prepayment", label: "Предоплата" },
    { value: "postpayment", label: "Постоплата" },
    { value: "other_income", label: "Прочий доход" },
  ]

  const expenseCategories = [
    { value: "fot_animators", label: "ФОТ Аниматоры" },
    { value: "fot_hosts", label: "ФОТ Ведущие" },
    { value: "fot_djs", label: "ФОТ Диджеи" },
    { value: "fot_admin", label: "ФОТ Администратор" },
    { value: "rent", label: "Аренда" },
    { value: "marketing", label: "Маркетинг" },
    { value: "equipment", label: "Оборудование" },
    { value: "other_expense", label: "Прочий расход" },
  ]

  const categories = formData.type === "income" ? incomeCategories : expenseCategories

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.amount || !formData.category) return

    setLoading(true)
    try {
      const url = transaction?.id ? `/api/transactions/${transaction.id}` : "/api/transactions"
      const method = transaction?.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          type: formData.type,
          amount: Number.parseFloat(formData.amount),
          category: formData.category,
          description: formData.description,
          date: formData.date,
          franchiseeId: user?.franchiseeId,
        }),
      })

      if (!response.ok) throw new Error("Failed to save transaction")

      const result = await response.json()
      onSubmit(result.transaction || result)
      onClose()
    } catch (error) {
      console.error("[v0] Error saving transaction:", error)
    } finally {
      setLoading(false)
    }
  }

  const isEditing = !!transaction?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md">
        <div className="border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing
              ? "Редактирование транзакции"
              : formData.type === "income"
                ? "Новое поступление"
                : "Новый расход"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Тип транзакции</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "income", category: "" })}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  formData.type === "income"
                    ? "bg-green-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Поступление
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "expense", category: "" })}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  formData.type === "expense"
                    ? "bg-red-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Расход
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Сумма (₽) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
              placeholder="10000"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Категория <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Дата</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary resize-none"
              rows={3}
              placeholder="Дополнительная информация..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount || !formData.category}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                formData.type === "income" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? "Сохранение..." : isEditing ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
