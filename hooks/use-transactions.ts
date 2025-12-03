import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { transactionsApi } from "@/lib/api/transactions"
import type { Transaction, TransactionFilters } from "@/lib/types"

export function useTransactions(filters?: TransactionFilters, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["transactions", filters, page, limit],
    queryFn: () => transactionsApi.getAll(filters, page, limit),
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["transactions", id],
    queryFn: () => transactionsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Transaction>) => transactionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) => transactionsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["transactions", variables.id] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}
