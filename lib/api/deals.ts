import { api } from "./client"
import type { Deal, DealFilters, PaginatedResponse } from "../types"

export const dealsApi = {
  getAll: (filters?: DealFilters, page = 1, limit = 50) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.locationId && { locationId: filters.locationId }),
      ...(filters?.stage && { stage: filters.stage }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.search && { search: filters.search }),
    })
    return api.get<PaginatedResponse<Deal>>(`/deals?${params}`)
  },

  getById: (id: string) => api.get<Deal>(`/deals/${id}`),

  create: (data: Partial<Deal>) => api.post<Deal>("/deals", data),

  update: (id: string, data: Partial<Deal>) => api.put<Deal>(`/deals/${id}`, data),

  updateStage: (id: string, stage: string) =>
    api.put<{ deal: Deal; transaction?: any }>(`/deals/${id}/stage`, { stage }),

  delete: (id: string) => api.delete(`/deals/${id}`),
}
