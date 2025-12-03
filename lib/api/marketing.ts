import { apiClient } from "./client"
import type { MarketingCampaign, MarketingMessage, PaginatedResponse } from "../types"

export const marketingApi = {
  getCampaigns: async (): Promise<PaginatedResponse<MarketingCampaign>> => {
    return apiClient.get("/marketing/campaigns")
  },

  createCampaign: async (data: Partial<MarketingCampaign>): Promise<MarketingCampaign> => {
    return apiClient.post("/marketing/campaigns", data)
  },

  updateCampaign: async (id: string, data: Partial<MarketingCampaign>): Promise<MarketingCampaign> => {
    return apiClient.put(`/marketing/campaigns/${id}`, data)
  },

  toggleCampaign: async (id: string, isActive: boolean): Promise<MarketingCampaign> => {
    return apiClient.patch(`/marketing/campaigns/${id}/toggle`, { isActive })
  },

  getMessages: async (campaignId?: string): Promise<PaginatedResponse<MarketingMessage>> => {
    return apiClient.get("/marketing/messages", { params: { campaignId } })
  },

  getStats: async (campaignId: string) => {
    return apiClient.get(`/marketing/campaigns/${campaignId}/stats`)
  },
}
