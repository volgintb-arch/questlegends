"use client"

import { useState, useEffect } from "react"
import { Download, X, Monitor, Smartphone } from "lucide-react"
import { canInstallPWA, installPWA, isStandalone } from "@/lib/pwa"

export function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    // Don't show in standalone mode (already installed)
    if (isStandalone()) return

    setCanInstall(canInstallPWA())

    const onAvailable = () => setCanInstall(true)
    const onInstalled = () => {
      setCanInstall(false)
      setShowGuide(false)
    }

    window.addEventListener("pwa-install-available", onAvailable)
    window.addEventListener("pwa-installed", onInstalled)

    // If no beforeinstallprompt fired within 3 seconds, still show the button
    // (for browsers that don't support the event, we'll show manual instructions)
    const timer = setTimeout(() => {
      if (!canInstallPWA()) {
        setCanInstall(true) // Show button for manual guide
      }
    }, 3000)

    return () => {
      window.removeEventListener("pwa-install-available", onAvailable)
      window.removeEventListener("pwa-installed", onInstalled)
      clearTimeout(timer)
    }
  }, [])

  if (isStandalone()) return null

  const handleClick = async () => {
    // Try native prompt first
    if (canInstallPWA()) {
      try {
        const accepted = await Promise.race([
          installPWA(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
        ])
        if (accepted) {
          setCanInstall(false)
          return
        }
      } catch {
        // Native prompt failed
      }
    }
    // Show manual guide
    setShowGuide(true)
  }

  if (!canInstall) return null

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer gradient-primary text-white hover:opacity-90 transition-all shadow-md relative z-10"
        title="Установить приложение на компьютер"
      >
        <Download className="h-4 w-4" />
        <span className="hidden lg:inline">Установить</span>
      </button>

      {/* Installation guide modal */}
      {showGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
          <div className="relative glass-card rounded-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold gradient-primary-text">Установить приложение</h3>
              <button onClick={() => setShowGuide(false)} className="p-1 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Приложение «Легенда об Искателях» можно установить на компьютер или телефон для быстрого доступа и работы без интернета.
            </p>

            {/* Desktop instructions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Monitor className="h-4 w-4 text-primary" />
                <span>На компьютере (Chrome / Edge)</span>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 ml-6 list-decimal">
                <li>Нажмите на иконку <strong>⋮</strong> (три точки) в правом верхнем углу браузера</li>
                <li>Выберите <strong>«Установить приложение»</strong> или <strong>«Сохранить и поделиться» → «Установить»</strong></li>
                <li>Подтвердите установку в появившемся окне</li>
              </ol>
            </div>

            <div className="border-t border-border" />

            {/* Mobile instructions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>На телефоне</span>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 ml-6 list-decimal">
                <li><strong>Chrome (Android):</strong> меню ⋮ → «Установить приложение»</li>
                <li><strong>Safari (iPhone):</strong> нажмите <strong>⎙</strong> (поделиться) → «На экран Домой»</li>
              </ol>
            </div>

            <div className="border-t border-border" />

            <p className="text-xs text-muted-foreground">
              После установки приложение будет доступно на рабочем столе. Данные синхронизируются автоматически при наличии интернета.
            </p>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-lg gradient-primary text-white font-medium text-sm cursor-pointer hover:opacity-90 transition-all"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  )
}
