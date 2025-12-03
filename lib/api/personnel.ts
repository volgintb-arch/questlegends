import { api } from "./client"
import type { Personnel, PersonnelFilters } from "../types"

export const personnelApi = {
  getAll: (filters?: PersonnelFilters) => {
    const params = new URLSearchParams({
      ...(filters?.locationId && { locationId: filters.locationId }),
      ...(filters?.role && { role: filters.role }),
      ...(filters?.status && { status: filters.status }),
    })
    return api.get<Personnel[]>(`/personnel?${params}`)
  },

  getById: (id: string) => api.get<Personnel>(`/personnel/${id}`),

  create: (data: Partial<Personnel>) => api.post<Personnel>("/personnel", data),

  update: (id: string, data: Partial<Personnel>) => api.put<Personnel>(`/personnel/${id}`, data),

  delete: (id: string) => api.delete(`/personnel/${id}`),
}
