"use client"

import { useState, useEffect } from "react"
import { Download, Monitor } from "lucide-react"
import { canInstallPWA, installPWA, onInstallAvailable, isStandalone } from "@/lib/pwa"

export function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false)
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    setCanInstall(canInstallPWA())
    setStandalone(isStandalone())
    const unsubscribe = onInstallAvailable(setCanInstall)
    return unsubscribe
  }, [])

  if (standalone || !canInstall) return null

  const handleInstall = async () => {
    await installPWA()
    setCanInstall(false)
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg glass hover:bg-primary/10 transition-colors text-primary"
      title="Установить приложение"
    >
      <Download className="h-4 w-4" />
      <span className="hidden lg:inline">Установить</span>
    </button>
  )
}
