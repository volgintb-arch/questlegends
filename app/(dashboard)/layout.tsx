"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/auth-context"
import { ErrorBoundary } from "@/components/error-boundary"
import { OnboardingSlider } from "@/components/onboarding-slider"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, completeOnboarding } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [isLoading, user, router])

  // Check royalty payments on dashboard load (once per session)
  useEffect(() => {
    if (!user) return
    const key = `royalty-check-${new Date().toISOString().slice(0, 10)}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")

    const token = localStorage.getItem("auth-token")
    if (!token) return
    fetch("/api/notifications/check-royalty", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }, [user])

  // Auto-subscribe to push notifications
  useEffect(() => {
    if (!user) return
    if (typeof window === "undefined") return
    if (!("Notification" in window && "serviceWorker" in navigator && "PushManager" in window)) return

    const trySubscribe = async () => {
      try {
        // Check if already subscribed
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing) return // already subscribed

        // Only proceed if permission already granted or ask once per session
        const asked = sessionStorage.getItem("push-asked")
        if (asked) return
        sessionStorage.setItem("push-asked", "1")

        const perm = await Notification.requestPermission()
        if (perm !== "granted") return

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) return

        const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4)
        const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/")
        const rawData = window.atob(base64)
        const applicationServerKey = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))

        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })

        const token = localStorage.getItem("auth-token")
        if (!token) return

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        })
        console.log("[Push] Auto-subscribed successfully")
      } catch (err) {
        console.error("[Push] Auto-subscribe error:", err)
      }
    }

    trySubscribe()
  }, [user])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-mesh">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-mesh">
        <div className="text-center">
          <p className="text-muted-foreground">Перенаправление на страницу входа...</p>
        </div>
      </div>
    )
  }

  const getRoleDisplayName = (role: string) => {
    const roleLabels: Record<string, string> = {
      super_admin: "Управляющая Компания",
      uk: "Управляющая Компания",
      uk_employee: "Сотрудник УК",
      franchisee: "Франчайзи",
      own_point: "Собственная Точка",
      admin: "Администратор",
      employee: "Сотрудник",
      animator: "Аниматор",
      host: "Ведущий",
      dj: "DJ",
    }
    return roleLabels[role] || role
  }

  const showOnboarding = user && !user.onboardingCompleted

  return (
    <ErrorBoundary>
      {showOnboarding && (
        <OnboardingSlider
          role={user.role}
          userName={user.name}
          onComplete={completeOnboarding}
        />
      )}
      <div className="flex h-screen bg-mesh overflow-hidden">
        <Sidebar
          role={user.role}
          currentPath={pathname}
          isMobileOpen={isMobileSidebarOpen}
          onMobileToggle={setIsMobileSidebarOpen}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            userName={user.name}
            role={getRoleDisplayName(user.role)}
            onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 pb-20 md:pb-8">{children}</div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
