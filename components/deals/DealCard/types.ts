import type React from "react"

export interface FeedEvent {
  id: string
  type: string
  content: string
  createdAt: string
  userName: string
  userId?: string
  metadata?: any
}

export interface DealTask {
  id: string
  title: string
  description?: string
  assigneeId?: string
  assigneeName?: string
  deadline?: string
  completed: boolean
  createdAt: string
  type?: string
}

export interface DealFile {
  id: string
  name: string
  url: string
  type?: string
  size?: number
  createdAt: string
}

export interface DealData {
  id: string
  clientName: string
  clientPhone?: string
  clientTelegram?: string
  price?: number
  stage: string
  stageId?: string
  pipelineId?: string
  location?: string
  source?: string
  responsible?: string
  responsibleId?: string
  responsibleName?: string
  createdAt: string
  contactName?: string
  contactPhone?: string
  messengerLink?: string
  city?: string
  paushalnyyVznos?: number
  investmentAmount?: number
  leadSource?: string
  additionalComment?: string
}

export interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
}

export interface DealCardAmoCRMProps {
  deal: DealData
  isOpen: boolean
  onClose: () => void
  onUpdate: (deal: DealData) => void
  stages?: PipelineStage[]
}

export interface Employee {
  id: string
  name: string
  role: string
  telegramId?: string
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}
