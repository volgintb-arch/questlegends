"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface AlertData {
  id: string
  location: string
  dealId: string
  message: string
  franchisee: string
  severity: "critical" | "warning"
  comments: Array<{
    id: string
    author: string
    text: string
    timestamp: string
    role: string
  }>
  archived: boolean
}

interface AlertsContextType {
  alerts: AlertData[]
  addAlert: (alert: Omit<AlertData, "id" | "comments" | "archived">) => void
  archiveAlert: (alertId: string) => void
  deleteAlert: (alertId: string) => void
  updateAlert: (alertId: string, alert: Partial<AlertData>) => void
  getAlert: (alertId: string) => AlertData | undefined
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined)

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertData[]>([
    {
      id: "A-001",
      location: "Москва",
      dealId: "DEAL-2547",
      message: "нарушен стандарт качества обслуживания",
      franchisee: "Франчайзи Москва-Юг",
      severity: "critical",
      comments: [
        {
          id: "C-1",
          author: "Система",
          text: "Обнаружен критический сбой в системе франчайзи",
          timestamp: "2025-11-26 14:30",
          role: "system",
        },
      ],
      archived: false,
    },
    {
      id: "A-002",
      location: "СПб",
      dealId: "DEAL-2589",
      message: "критическое отставание по плану продаж",
      franchisee: "Франчайзи СПб-Север",
      severity: "warning",
      comments: [
        {
          id: "C-1",
          author: "Система",
          text: "Отставание по плану: 35%",
          timestamp: "2025-11-26 12:00",
          role: "system",
        },
      ],
      archived: false,
    },
    {
      id: "A-003",
      location: "Казань",
      dealId: "DEAL-2601",
      message: "невыплачен роялти в срок",
      franchisee: "Франчайзи Казань",
      severity: "critical",
      comments: [
        {
          id: "C-1",
          author: "Система",
          text: "Просрочка платежа: 5 дней",
          timestamp: "2025-11-25 10:00",
          role: "system",
        },
      ],
      archived: false,
    },
  ])

  const archiveAlert = (alertId: string) => {
    setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, archived: true } : a)))
  }

  const deleteAlert = (alertId: string) => {
    setAlerts(alerts.filter((a) => a.id !== alertId))
  }

  const updateAlert = (alertId: string, updatedAlert: Partial<AlertData>) => {
    setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, ...updatedAlert } : a)))
  }

  const addAlert = (alert: Omit<AlertData, "id" | "comments" | "archived">) => {
    const newAlert: AlertData = {
      ...alert,
      id: `A-${Date.now()}`,
      comments: [
        {
          id: "C-1",
          author: "Система",
          text: "Новый сбой обнаружен",
          timestamp: new Date().toLocaleString("ru-RU"),
          role: "system",
        },
      ],
      archived: false,
    }
    setAlerts([...alerts, newAlert])
  }

  const getAlert = (alertId: string) => {
    return alerts.find((a) => a.id === alertId)
  }

  return (
    <AlertsContext.Provider value={{ alerts, addAlert, archiveAlert, deleteAlert, updateAlert, getAlert }}>
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  const context = useContext(AlertsContext)
  if (!context) {
    throw new Error("useAlerts must be used within AlertsProvider")
  }
  return context
}
