import { api } from "./client"

export interface SearchResult {
  id: string
  type: "deal" | "transaction" | "expense" | "personnel" | "article" | "franchisee"
  title: string
  subtitle?: string
  metadata?: Record<string, any>
  url: string
}

export const searchApi = {
  globalSearch: (query: string) => api.get<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`),
}
