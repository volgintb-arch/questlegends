import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { expensesApi } from "@/lib/api/expenses"
import type { Expense, ExpenseFilters } from "@/lib/types"

export function useExpenses(filters?: ExpenseFilters, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["expenses", filters, page, limit],
    queryFn: () => expensesApi.getAll(filters, page, limit),
  })
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ["expenses", id],
    queryFn: () => expensesApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Expense>) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Expense> }) => expensesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["expenses", variables.id] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
    },
  })
}
