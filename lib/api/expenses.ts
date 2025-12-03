import { api } from "./client"
import type { Expense, ExpenseFilters, PaginatedResponse } from "../types"

export const expensesApi = {
  getAll: (filters?: ExpenseFilters, page = 1, limit = 50) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.locationId && { locationId: filters.locationId }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.status && { status: filters.status }),
    })
    return api.get<PaginatedResponse<Expense>>(`/expenses?${params}`)
  },

  getById: (id: string) => api.get<Expense>(`/expenses/${id}`),

  create: (data: Partial<Expense>) => api.post<Expense>("/expenses", data),

  update: (id: string, data: Partial<Expense>) => api.put<Expense>(`/expenses/${id}`, data),

  delete: (id: string) => api.delete(`/expenses/${id}`),
}
