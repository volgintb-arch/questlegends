import { apiClient } from "./client"
import type { Shift, ShiftFilters, ShiftStats, ShiftTemplate, PaginatedResponse } from "../types"

export const shiftsApi = {
  getShifts: async (filters?: ShiftFilters): Promise<PaginatedResponse<Shift>> => {
    return apiClient.get("/shifts", { params: filters })
  },

  getShift: async (id: string): Promise<Shift> => {
    return apiClient.get(`/shifts/${id}`)
  },

  createShift: async (data: Partial<Shift>): Promise<Shift> => {
    return apiClient.post("/shifts", data)
  },

  updateShift: async (id: string, data: Partial<Shift>): Promise<Shift> => {
    return apiClient.put(`/shifts/${id}`, data)
  },

  deleteShift: async (id: string): Promise<void> => {
    return apiClient.delete(`/shifts/${id}`)
  },

  getShiftsByPersonnel: async (personnelId: string, dateFrom: Date, dateTo: Date): Promise<Shift[]> => {
    return apiClient.get(`/shifts/personnel/${personnelId}`, {
      params: { dateFrom, dateTo },
    })
  },

  getShiftStats: async (personnelId: string, dateFrom: Date, dateTo: Date): Promise<ShiftStats> => {
    return apiClient.get(`/shifts/personnel/${personnelId}/stats`, {
      params: { dateFrom, dateTo },
    })
  },

  bulkCreateShifts: async (shifts: Partial<Shift>[]): Promise<Shift[]> => {
    return apiClient.post("/shifts/bulk", { shifts })
  },

  getTemplates: async (locationId: string): Promise<ShiftTemplate[]> => {
    return apiClient.get("/shifts/templates", { params: { locationId } })
  },

  createTemplate: async (data: Partial<ShiftTemplate>): Promise<ShiftTemplate> => {
    return apiClient.post("/shifts/templates", data)
  },

  applyTemplate: async (templateId: string, personnelId: string, dateFrom: Date, dateTo: Date): Promise<Shift[]> => {
    return apiClient.post(`/shifts/templates/${templateId}/apply`, {
      personnelId,
      dateFrom,
      dateTo,
    })
  },
}
