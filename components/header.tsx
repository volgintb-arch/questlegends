"use client"

import { useState, useEffect } from "react"
import { Moon, Sun, Bell, User, LogOut, SettingsIcon, ChevronDown, Menu } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { ProfileSettingsModal } from "./profile-settings-modal"
import { GlobalSearch } from "./global-search"

interface HeaderProps {
  userName: string
  role: string
  onViewChange?: (view: string) => void
  onMobileMenuToggle?: () => void
}

export function Header({ userName, role, onViewChange, onMobileMenuToggle }: HeaderProps) {
  const [isDark, setIsDark] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, getAuthHeaders, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return
      try {
        const response = await fetch("/api/notifications?unreadOnly=true", {
          headers: getAuthHeaders(),
        })
        if (response.ok) {
          const data = await response.json()
          const notifications = data.data || data.notifications || []
          setUnreadCount(Array.isArray(notifications) ? notifications.length : 0)
        }
      } catch (error) {
        console.error("[v0] Error fetching notifications:", error)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [user, getAuthHeaders])

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle("dark")
  }

  const handleLogout = async () => {
    console.log("[v0] Logging out user")
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
      <header className="sticky top-0 z-30 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 py-3 sm:px-4 sm:py-4 md:px-6">
          <button onClick={onMobileMenuToggle} className="md:hidden p-2 hover:bg-muted/50 rounded-lg transition-colors">
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          <div className="flex items-center gap-3 flex-1">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications)
                  setShowAccountMenu(false)
                  if (onViewChange) {
                    onViewChange("notifications")
                  }
                }}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors relative"
              >
                <Bell className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-accent rounded-full text-[9px] sm:text-[10px] font-semibold flex items-center justify-center text-accent-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <button onClick={toggleTheme} className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
              {isDark ? (
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
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs sm:text-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-sm text-left">
                  <p className="font-medium text-foreground">{userName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{role}</p>
                </div>
                <ChevronDown
                  className={`hidden sm:block w-4 h-4 text-muted-foreground transition-transform ${showAccountMenu ? "rotate-180" : ""}`}
                />
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  <div className="p-3 sm:p-4 border-b border-border">
                    <p className="font-medium text-foreground text-sm sm:text-base">{userName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{role}</p>
                  </div>
                  <div className="py-1 sm:py-2">
                    <button
                      onClick={handleSettings}
                      className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 sm:gap-3 text-foreground"
                    >
                      <SettingsIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Настройки профиля
                    </button>
                    <button
                      onClick={() => {
                        if (onViewChange) onViewChange("access")
                        setShowAccountMenu(false)
                      }}
                      className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 sm:gap-3 text-foreground"
                    >
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Управление доступом
                    </button>
                  </div>
                  <div className="border-t border-border">
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
    </>
  )
}
