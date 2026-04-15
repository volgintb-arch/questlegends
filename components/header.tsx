"use client"

import { useState, useEffect, useCallback } from "react"
import { Moon, Sun, Bell, BellRing, BellOff, User, LogOut, SettingsIcon, ChevronDown, Menu, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { ProfileSettingsModal } from "./profile-settings-modal"
import { GlobalSearch } from "./global-search"
import { PWAInstallButton } from "./pwa-install-button"
import { isStandalone, canInstallPWA, installPWA } from "@/lib/pwa"

interface HeaderProps {
  userName: string
  role: string
  onViewChange?: (view: string) => void
  onMobileMenuToggle?: () => void
}

export function Header({ userName, role, onViewChange, onMobileMenuToggle }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pushState, setPushState] = useState<"off" | "on">("off")
  const { user, getAuthHeaders, logout, exitViewingMode } = useAuth()
  const router = useRouter()

  const fetchNotificationCount = useCallback(async () => {
    if (!user) return
    try {
      const response = await fetch("/api/notifications/count", {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      console.error("[v0] Error fetching notification count:", error)
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchNotificationCount()
    const interval = setInterval(fetchNotificationCount, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [fetchNotificationCount])

  useEffect(() => {
    const handleRefresh = () => fetchNotificationCount()
    window.addEventListener("refreshNotificationCount", handleRefresh)
    return () => window.removeEventListener("refreshNotificationCount", handleRefresh)
  }, [fetchNotificationCount])

  useEffect(() => { setMounted(true) }, [])

  // Check push notification status — always show button, check on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        navigator.serviceWorker.getRegistration().then(async (reg) => {
          if (!reg) { setPushState("off"); return }
          const sub = await reg.pushManager?.getSubscription()
          setPushState(sub ? "on" : "off")
        }).catch(() => setPushState("off"))
      } else {
        setPushState("off")
      }
    } catch {
      setPushState("off")
    }
  }, [])

  const [showPushInstallHint, setShowPushInstallHint] = useState(false)

  const togglePush = async () => {
    const hasPushSupport = "serviceWorker" in navigator && "Notification" in window && "PushManager" in window

    if (!hasPushSupport) {
      // If not installed as PWA — prompt to install
      if (!isStandalone()) {
        if (canInstallPWA()) {
          const accepted = await installPWA()
          if (accepted) return // will reload as PWA
        }
        setShowPushInstallHint(true)
        return
      }
      alert("Ваш браузер не поддерживает push-уведомления.")
      return
    }

    try {
      let reg = await navigator.serviceWorker.getRegistration()
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js")
        await navigator.serviceWorker.ready
        reg = await navigator.serviceWorker.getRegistration()
        if (!reg) { alert("Не удалось зарегистрировать сервис-воркер"); return }
      }

      const existing = await reg.pushManager.getSubscription()

      if (existing) {
        // Unsubscribe
        await existing.unsubscribe()
        const token = localStorage.getItem("auth-token")
        if (token) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ endpoint: existing.endpoint }),
          }).catch(() => {})
        }
        setPushState("off")
        return
      }

      // Subscribe
      const perm = await Notification.requestPermission()
      if (perm !== "granted") {
        setPushState("off")
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) { setPushState("off"); return }

      const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4)
      const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/")
      const rawData = window.atob(base64)
      const applicationServerKey = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))

      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })

      const token = localStorage.getItem("auth-token")
      if (token) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        })
      }
      setPushState("on")
    } catch (err) {
      console.error("[Push] Toggle error:", err)
      setPushState("off")
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const isDark = theme === "dark"

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("[v0] Logout error:", error)
    }
  }

  const handleSettings = () => {
    setShowProfileSettings(true)
    setShowAccountMenu(false)
  }

  return (
    <>
      <header className="sticky top-0 z-30 w-full glass-header">
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 py-3 sm:px-4 sm:py-4 md:px-6">
          <button onClick={onMobileMenuToggle} className="md:hidden p-2 hover:bg-muted/50 rounded-lg transition-colors">
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          <div className="flex items-center gap-3 flex-1">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <PWAInstallButton />

            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(false)
                  setShowAccountMenu(false)
                  router.push("/notifications")
                }}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors relative"
              >
                <Bell className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 gradient-primary rounded-full text-[9px] sm:text-[10px] font-semibold flex items-center justify-center text-white notification-pulse">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={togglePush}
              className={`p-2 rounded-lg transition-colors ${pushState === "on" ? "text-primary bg-primary/10" : "hover:bg-muted/50 text-muted-foreground"}`}
              title={pushState === "on" ? "Push-уведомления включены" : "Включить push-уведомления"}
            >
              {pushState === "on" ? (
                <BellRing className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              ) : (
                <BellOff className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              )}
            </button>

            <button onClick={toggleTheme} className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
              {!mounted ? (
                <Sun className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-foreground" />
              ) : isDark ? (
                <Sun className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-foreground" />
              ) : (
                <Moon className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-foreground" />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  setShowAccountMenu(!showAccountMenu)
                  setShowNotifications(false)
                }}
                className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border hover:bg-muted/50 rounded-lg transition-colors px-2 sm:px-3 py-2"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={userName} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg gradient-primary flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-sm text-left">
                  <p className="font-medium text-foreground">{userName}</p>
                </div>
                <ChevronDown
                  className={`hidden sm:block w-4 h-4 text-muted-foreground transition-transform ${showAccountMenu ? "rotate-180" : ""}`}
                />
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-56 sm:w-64 glass-popover rounded-xl shadow-lg overflow-hidden">
                  <div className="p-3 sm:p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground text-sm sm:text-base flex-1">{userName}</p>
                      {user?.viewingAs && (
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                      )}
                    </div>
                  </div>
                  {user?.viewingAs && (
                    <div className="px-3 sm:px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
                      <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">Просмотр как другой пользователь</p>
                    </div>
                  )}
                  <div className="py-1 sm:py-2">
                    {!user?.viewingAs && (
                      <>
                        <button
                          onClick={handleSettings}
                          className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 sm:gap-3 text-foreground"
                        >
                          <SettingsIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Настройки профиля
                        </button>
                        <button
                          onClick={() => {
                            router.push("/access")
                            setShowAccountMenu(false)
                          }}
                          className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 sm:gap-3 text-foreground"
                        >
                          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Управление доступом
                        </button>
                      </>
                    )}
                  </div>
                  <div className="border-t border-border">
                    {user?.viewingAs && (
                      <button
                        onClick={() => {
                          exitViewingMode()
                          setShowAccountMenu(false)
                        }}
                        className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-blue-500/10 transition-colors flex items-center gap-2 sm:gap-3 text-blue-500"
                      >
                        <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Выйти из просмотра
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleLogout()
                        setShowAccountMenu(false)
                      }}
                      className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-red-500/10 transition-colors flex items-center gap-2 sm:gap-3 text-red-500"
                    >
                      <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Выйти из системы
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <ProfileSettingsModal isOpen={showProfileSettings} onClose={() => setShowProfileSettings(false)} />

      {/* Push install hint modal */}
      {showPushInstallHint && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPushInstallHint(false)} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Push-уведомления</h3>
              <button onClick={() => setShowPushInstallHint(false)} className="p-1 hover:bg-muted rounded-lg">
                <BellOff className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Для получения push-уведомлений установите приложение на главный экран:
            </p>

            <div className="text-sm space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="font-medium">Android (Chrome)</p>
                <p className="text-muted-foreground text-xs">Меню <strong>⋮</strong> → «Установить приложение»</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="font-medium">Android (Яндекс)</p>
                <p className="text-muted-foreground text-xs">Меню <strong>☰</strong> → «Добавить на главный экран»</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="font-medium">iPhone / iPad</p>
                <p className="text-muted-foreground text-xs">Safari → <strong>Поделиться</strong> → «На экран Домой»</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              После установки откройте приложение и нажмите эту кнопку ещё раз.
            </p>

            <button
              onClick={() => setShowPushInstallHint(false)}
              className="w-full py-2.5 rounded-lg gradient-primary text-white font-medium text-sm"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  )
}
