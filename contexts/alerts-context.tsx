"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

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
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/alerts")
        const data = await response.json()

        if (data.success && data.data?.alerts) {
          const transformed = data.data.alerts.map((a: any) => ({
            id: a.id,
            location: a.location,
            dealId: a.deal?.id || a.dealId,
            message: a.message,
            franchisee: a.franchisee.name,
            severity: a.severity,
            comments: a.comments.map((c: any) => ({
              id: c.id,
              author: c.author.name,
              text: c.text,
              timestamp: new Date(c.createdAt).toLocaleString("ru-RU"),
              role: c.author.role,
            })),
            archived: a.isArchived,
          }))
          setAlerts(transformed)
        }
      } catch (error) {
        console.error("[v0] Error fetching alerts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  const archiveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      })
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, archived: true } : a)))
    } catch (error) {
      console.error("[v0] Error archiving alert:", error)
    }
  }

  const deleteAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, {
        method: "DELETE",
      })
      setAlerts(alerts.filter((a) => a.id !== alertId))
    } catch (error) {
      console.error("[v0] Error deleting alert:", error)
    }
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
