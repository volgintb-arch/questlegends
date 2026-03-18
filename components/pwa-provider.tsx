"use client"

import { useEffect } from "react"
import { registerServiceWorker } from "@/lib/pwa"
import { OfflineIndicator } from "./offline-indicator"

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  )
}
