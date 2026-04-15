"use client"

import { useState, useEffect } from "react"
import { Download, X, Monitor, Smartphone, Globe } from "lucide-react"
import { canInstallPWA, installPWA, isStandalone } from "@/lib/pwa"

export function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
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
    const timer = setTimeout(() => {
      if (!canInstallPWA()) {
        setCanInstall(true)
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

      {showGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold gradient-primary-text">Установить приложение</h3>
              <button onClick={() => setShowGuide(false)} className="p-1 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Приложение «Легенда об Искателях» можно установить на компьютер или телефон для быстрого доступа и работы без интернета.
            </p>

            {/* Chrome / Edge */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Monitor className="h-4 w-4 text-primary" />
                <span>Google Chrome / Microsoft Edge</span>
              </div>
              <ol className="text-sm text-muted-foreground space-y-1.5 ml-6 list-decimal">
                <li>Нажмите <strong>⋮</strong> (три точки) в правом верхнем углу</li>
                <li>Выберите <strong>«Установить приложение»</strong></li>
                <li>Нажмите <strong>«Установить»</strong> в диалоге</li>
              </ol>
            </div>

            <div className="border-t border-border" />

            {/* Yandex Browser */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-4 w-4 text-primary" />
                <span>Яндекс Браузер</span>
              </div>
              <ol className="text-sm text-muted-foreground space-y-1.5 ml-6 list-decimal">
                <li>Нажмите <strong>☰</strong> (три полоски) в правом верхнем углу</li>
                <li>Выберите <strong>«Дополнительно»</strong></li>
                <li>Нажмите <strong>«Установить приложение»</strong></li>
              </ol>
              <p className="text-xs text-muted-foreground ml-6 italic">
                Или нажмите на иконку 📥 в адресной строке (если она появилась)
              </p>
            </div>

            <div className="border-t border-border" />

            {/* Safari macOS */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Monitor className="h-4 w-4 text-primary" />
                <span>Safari (macOS)</span>
              </div>
              <ol className="text-sm text-muted-foreground space-y-1.5 ml-6 list-decimal">
                <li>Откройте меню <strong>«Файл»</strong> в верхней панели</li>
                <li>Выберите <strong>«Добавить в Dock»</strong></li>
              </ol>
            </div>

            <div className="border-t border-border" />

            {/* Mobile */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>На телефоне</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-2 ml-6">
                <div>
                  <strong>Android (Chrome):</strong>
                  <span> меню ⋮ → «Установить приложение»</span>
                </div>
                <div>
                  <strong>Android (Яндекс):</strong>
                  <span> меню ☰ → «Добавить на главный экран»</span>
                </div>
                <div>
                  <strong>iPhone / iPad (Safari):</strong>
                  <span> нажмите </span>
                  <strong>⎙</strong>
                  <span> (Поделиться) → «На экран &laquo;Домой&raquo;»</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            <p className="text-xs text-muted-foreground">
              После установки приложение появится на рабочем столе / главном экране. Данные синхронизируются автоматически при наличии интернета.
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
