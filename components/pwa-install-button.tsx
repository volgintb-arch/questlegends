"use client"

import { useState, useEffect } from "react"
import { Download } from "lucide-react"
import { canInstallPWA, installPWA, isStandalone } from "@/lib/pwa"

export function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    setCanInstall(canInstallPWA())

    const onAvailable = () => setCanInstall(true)
    const onInstalled = () => setCanInstall(false)

    window.addEventListener("pwa-install-available", onAvailable)
    window.addEventListener("pwa-installed", onInstalled)

    return () => {
      window.removeEventListener("pwa-install-available", onAvailable)
      window.removeEventListener("pwa-installed", onInstalled)
    }
  }, [])

  if (isStandalone() || !canInstall) return null

  const handleInstall = async () => {
    setInstalling(true)
    try {
      const accepted = await installPWA()
      if (accepted) {
        setCanInstall(false)
      }
    } catch (e) {
      console.error("[PWA] Install error:", e)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <button
      onClick={handleInstall}
      disabled={installing}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer gradient-primary text-white hover:opacity-90 transition-all shadow-md disabled:opacity-50 relative z-10"
      title="Установить приложение на компьютер"
    >
      <Download className="h-4 w-4" />
      <span className="hidden lg:inline">{installing ? "Установка..." : "Установить"}</span>
    </button>
  )
}
