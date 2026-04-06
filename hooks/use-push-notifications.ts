"use client"

import { useState, useEffect, useCallback } from "react"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications(getAuthHeaders: () => Record<string, string>) {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const ok = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window
    setSupported(ok)
    if (ok) {
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkSubscription = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setIsSubscribed(!!sub)
    } catch {}
  }, [])

  const subscribe = useCallback(async () => {
    if (!supported) return false
    setIsLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== "granted") return false

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return false

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })

      if (res.ok) {
        setIsSubscribed(true)
        return true
      }
      return false
    } catch (err) {
      console.error("[Push] Subscribe error:", err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [supported, getAuthHeaders])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })

      await sub.unsubscribe()
      setIsSubscribed(false)
    } catch (err) {
      console.error("[Push] Unsubscribe error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  return { permission, isSubscribed, isLoading, supported, subscribe, unsubscribe }
}
