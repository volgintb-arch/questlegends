/**
 * PWA utilities: Service Worker registration, install prompt, update detection.
 */

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installListeners: Array<(canInstall: boolean) => void> = []

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// ── Register Service Worker ──
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      })

      // Check for updates periodically
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000) // Every hour

      // Handle updates
      registration.onupdatefound = () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.onstatechange = () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version available — notify user
            if (confirm("Доступно обновление. Обновить сейчас?")) {
              newWorker.postMessage({ type: "SKIP_WAITING" })
              window.location.reload()
            }
          }
        }
      }
    } catch (error) {
      console.error("[PWA] SW registration failed:", error)
    }
  })

  // Capture install prompt
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    installListeners.forEach((l) => l(true))
  })

  // Track successful install
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null
    installListeners.forEach((l) => l(false))
  })
}

// ── Install prompt ──
export function canInstallPWA(): boolean {
  return deferredPrompt !== null
}

export async function installPWA(): Promise<boolean> {
  if (!deferredPrompt) return false

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  installListeners.forEach((l) => l(false))
  return outcome === "accepted"
}

export function onInstallAvailable(listener: (canInstall: boolean) => void) {
  installListeners.push(listener)
  // Immediately notify if already available
  if (deferredPrompt) listener(true)
  return () => {
    installListeners = installListeners.filter((l) => l !== listener)
  }
}

// ── Detect standalone mode ──
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  )
}
