import { api } from "./client"
import type { AuditLog } from "../types"

export interface AuditFilters {
  entity?: string
  entityId?: string
  action?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
}

export const auditApi = {
  getAll: (filters?: AuditFilters, page = 1, limit = 50) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.entity && { entity: filters.entity }),
      ...(filters?.entityId && { entityId: filters.entityId }),
      ...(filters?.action && { action: filters.action }),
      ...(filters?.userId && { userId: filters.userId }),
    })
    return api.get<{ data: AuditLog[]; total: number }>(`/audit?${params}`)
  },

  getByEntity: (entity: string, entityId: string) => api.get<AuditLog[]>(`/audit/${entity}/${entityId}`),
}
