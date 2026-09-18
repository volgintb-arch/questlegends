/** Filter state of the ERP lists (was exported by the removed AdvancedFilters component). */
export interface FilterConfig {
  location?: string
  stage?: string
  priority?: string
  status?: string
  category?: string
  role?: string
  dateFrom?: string
  dateTo?: string
  timePeriod?: "today" | "yesterday" | "last7days" | "thisMonth" | "lastMonth" | "thisYear" | "custom"
  participantsMin?: number
  participantsMax?: number
  amountMin?: number
  amountMax?: number
  search?: string
}
