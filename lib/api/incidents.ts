import { apiClient } from "./client"
import type { Incident, PaginatedResponse } from "../types"

export interface IncidentFilters {
  locationId?: string
  severity?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
  responsiblePersonnelId?: string
}

export const incidentsApi = {
  getIncidents: async (filters?: IncidentFilters): Promise<PaginatedResponse<Incident>> => {
    return apiClient.get("/incidents", { params: filters })
  },

  getIncident: async (id: string): Promise<Incident> => {
    return apiClient.get(`/incidents/${id}`)
  },

  createIncident: async (data: Partial<Incident>): Promise<Incident> => {
    return apiClient.post("/incidents", data)
  },

  updateIncident: async (id: string, data: Partial<Incident>): Promise<Incident> => {
    return apiClient.put(`/incidents/${id}`, data)
  },

  deleteIncident: async (id: string): Promise<void> => {
    return apiClient.delete(`/incidents/${id}`)
  },

  uploadPhotos: async (id: string, files: File[]): Promise<string[]> => {
    const formData = new FormData()
    files.forEach((file) => formData.append("photos", file))
    return apiClient.post(`/incidents/${id}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  },

  resolveIncident: async (id: string, resolution: string): Promise<Incident> => {
    return apiClient.post(`/incidents/${id}/resolve`, { resolution })
  },
}
