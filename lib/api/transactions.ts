import { api } from "./client"
import type { Transaction, TransactionFilters, PaginatedResponse } from "../types"

export const transactionsApi = {
  getAll: (filters?: TransactionFilters, page = 1, limit = 50) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.locationId && { locationId: filters.locationId }),
      ...(filters?.status && { status: filters.status }),
    })
    return api.get<PaginatedResponse<Transaction>>(`/transactions?${params}`)
  },

  getById: (id: string) => api.get<Transaction>(`/transactions/${id}`),

  create: (data: Partial<Transaction>) => api.post<Transaction>("/transactions", data),

  update: (id: string, data: Partial<Transaction>) => api.put<Transaction>(`/transactions/${id}`, data),

  delete: (id: string) => api.delete(`/transactions/${id}`),
}
