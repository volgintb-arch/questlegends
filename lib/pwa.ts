/**
 * PWA utilities: Service Worker registration, install prompt, update detection.
 * Uses window.__pwaPrompt to persist the deferred prompt across module reloads.
 */

declare global {
  interface Window {
    __pwaPrompt: any | null
  }
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
            if (confirm("Доступно обновление приложения. Обновить сейчас?")) {
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

  // Capture install prompt — store on window to survive module reloads
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    window.__pwaPrompt = e
    window.dispatchEvent(new Event("pwa-install-available"))
  })

  // Track successful install
  window.addEventListener("appinstalled", () => {
    window.__pwaPrompt = null
    window.dispatchEvent(new Event("pwa-installed"))
  })
}

// ── Install prompt ──
export function canInstallPWA(): boolean {
  if (typeof window === "undefined") return false
  return window.__pwaPrompt != null
}

export async function installPWA(): Promise<boolean> {
  if (typeof window === "undefined" || !window.__pwaPrompt) return false

  try {
    const prompt = window.__pwaPrompt
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    window.__pwaPrompt = null
    window.dispatchEvent(new Event("pwa-installed"))
    return outcome === "accepted"
  } catch (e) {
    console.error("[PWA] Install prompt failed:", e)
    return false
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
