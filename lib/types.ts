// Core Entity Types
export interface User {
  id: string
  email: string
  name: string
  role: "uk" | "super_admin" | "uk_employee" | "franchisee" | "own_point" | "admin" | "employee" | "animator" | "host" | "dj"
  phone?: string
  telegram_id?: string
  whatsapp?: string
  avatar_url?: string
  description?: string
  is_active: boolean
  franchisee_id?: string // For non-uk roles
  created_at: Date
  updated_at: Date
}

export interface Franchisee {
  id: string
  name: string
  location: string
  address?: string
  manager_name?: string
  owner_user_id?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Deal {
  id: string
  title: string
  stage: string
  amount: number
  source?: string
  priority?: "low" | "medium" | "high"
  participants: number
  package?: string
  gameDate?: Date
  checkPerPerson: number
  animatorsCount: number
  animatorRate: number
  hostRate: number
  djRate: number
  locationId: string
  franchiseeId?: string
  responsibleId?: string
  amoDealId?: string
  clientName?: string
  clientPhone?: string
  clientEmail?: string
  contactCompany?: string
  contactSocialVk?: string
  contactSocialTelegram?: string
  contactSocialInstagram?: string
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  date: Date
  dealId?: string
  locationId: string
  amoDealId?: string
  participantsCount: number
  checkPerPerson: number
  animatorsCount: number
  animatorRate: number
  hostRate: number
  djRate: number
  totalRevenue: number
  royaltyAmount: number
  fotCalculation: number
  historicalRates?: Record<string, any>
  idempotencyKey: string
  status: "completed" | "pending" | "cancelled"
  createdAt: Date
  updatedAt: Date
}

export interface Expense {
  id: string
  location_id: string
  date: Date
  category: string
  amount: number
  description?: string
  receipt_url?: string
  status: "pending" | "approved" | "rejected"
  created_by?: string
  created_at: Date
  updated_at: Date
}

export interface Personnel {
  id: string
  location_id: string
  name: string
  role: string
  phone?: string
  email?: string
  telegram_id?: string
  status: "active" | "on_leave" | "inactive"
  join_date?: Date
  notes?: string
  user_id?: string
  created_at: Date
  updated_at: Date
}

export interface Notification {
  id: string
  user_id: string
  type: "system" | "deal" | "transaction" | "message_from_uk" | "assignment" | "kb_article"
  title: string
  message: string
  metadata?: Record<string, any>
  is_read: boolean
  created_at: Date
}

export interface KnowledgeBaseArticle {
  id: string
  title: string
  content: string
  category?: string
  author_id?: string
  is_published: boolean
  view_count: number
  created_at: Date
  updated_at: Date
}

export interface AuditLog {
  id: string
  entity: "deal" | "transaction" | "expense" | "personnel" | "role"
  entity_id: string
  action: "create" | "update" | "delete"
  field?: string
  old_value?: any
  new_value?: any
  user_id: string
  user_name: string
  created_at: Date
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pages: number
}

// Filter Types
export interface DealFilters {
  locationId?: string
  stage?: string
  priority?: string
  search?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface TransactionFilters {
  locationId?: string
  dateFrom?: Date
  dateTo?: Date
  status?: string
}

export interface ExpenseFilters {
  locationId?: string
  category?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface PersonnelFilters {
  locationId?: string
  role?: string
  status?: string
}

// Shift types for schedule management
export interface Shift {
  id: string
  personnel_id: string
  location_id: string
  date: Date
  start_time: string
  end_time: string
  role: string
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show"
  break_duration_minutes: number
  overtime_hours: number
  notes?: string
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface ShiftTemplate {
  id: string
  location_id: string
  name: string
  description?: string
  day_of_week: number
  start_time: string
  end_time: string
  role: string
  break_duration_minutes: number
  is_active: boolean
  created_at: Date
}

export interface ShiftFilters {
  locationId?: string
  personnelId?: string
  role?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface ShiftStats {
  totalHours: number
  regularHours: number
  overtimeHours: number
  shiftsCount: number
  noShowCount: number
}

// Incident types
export interface Incident {
  id: string
  title: string
  description: string
  photos: string[]
  responsible_personnel_id?: string
  deal_id?: string
  location_id: string
  client_name?: string
  severity: "low" | "medium" | "high" | "critical"
  status: "open" | "in_progress" | "resolved" | "closed"
  resolution?: string
  created_by: string
  resolved_by?: string
  resolved_at?: Date
  created_at: Date
  updated_at: Date
}

// Training/LMS types
export interface TrainingModule {
  id: string
  title: string
  description: string
  content: string
  category: string
  duration_minutes: number
  passing_score: number
  questions: TrainingQuestion[]
  is_mandatory: boolean
  is_published: boolean
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface TrainingQuestion {
  id: string
  question: string
  type: "single" | "multiple" | "text"
  options: string[]
  correct_answers: string[]
  points: number
}

export interface TrainingProgress {
  id: string
  personnel_id: string
  module_id: string
  status: "not_started" | "in_progress" | "completed" | "failed"
  score?: number
  attempts: number
  completed_at?: Date
  created_at: Date
  updated_at: Date
}

// Price History types
export interface PriceHistory {
  id: string
  entity_type: "check_per_person" | "animator_rate" | "host_rate" | "dj_rate" | "royalty_percent"
  entity_id?: string
  location_id?: string
  old_value: number
  new_value: number
  effective_from: Date
  changed_by: string
  reason?: string
  created_at: Date
}

// Marketing Automation types
export interface MarketingCampaign {
  id: string
  name: string
  type: "post_game" | "birthday" | "follow_up" | "reminder" | "review_request"
  trigger: string
  target_segment: string
  message_template: string
  send_delay_hours: number
  is_active: boolean
  sent_count: number
  opened_count: number
  clicked_count: number
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface MarketingMessage {
  id: string
  campaign_id: string
  deal_id?: string
  recipient_name: string
  recipient_phone?: string
  recipient_email?: string
  message: string
  status: "pending" | "sent" | "delivered" | "failed" | "opened" | "clicked"
  sent_at?: Date
  delivered_at?: Date
  opened_at?: Date
  error?: string
  created_at: Date
}

// Custom Pipeline types
export interface Pipeline {
  id: string
  name: string
  description?: string
  type: "b2c" | "b2b"
  stages: PipelineStage[]
  location_id?: string
  is_default: boolean
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  color: string
  order: number
  automation_trigger?: string
  is_final: boolean
  is_win: boolean
}
