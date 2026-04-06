/// Service Worker for QuestLegends PWA
const CACHE_VERSION = "ql-v1"
const STATIC_CACHE = `${CACHE_VERSION}-static`
const API_CACHE = `${CACHE_VERSION}-api`
const PAGE_CACHE = `${CACHE_VERSION}-pages`

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/login",
  "/logo.png",
  "/manifest.json",
]

// API routes that should be cached (GET only)
const CACHEABLE_API = [
  "/api/auth/me",
  "/api/pipelines",
  "/api/crm/deals",
  "/api/transactions",
  "/api/users",
  "/api/franchisees",
  "/api/knowledge",
  "/api/notifications",
  "/api/integrations",
  "/api/top-locations",
]

// ── Install: pre-cache shell ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── Activate: clean old caches ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("ql-") && k !== STATIC_CACHE && k !== API_CACHE && k !== PAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch strategy ──
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests — they go through the mutation queue
  if (request.method !== "GET") {
    return
  }

  // Skip websocket, chrome-extension, etc
  if (!url.protocol.startsWith("http")) {
    return
  }

  // API requests: Network-first, fallback to cache
  if (url.pathname.startsWith("/api/")) {
    if (CACHEABLE_API.some((p) => url.pathname.startsWith(p))) {
      event.respondWith(networkFirstWithCache(request, API_CACHE))
    }
    return
  }

  // Static assets (JS, CSS, images, fonts): Cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE))
    return
  }

  // Pages: Network-first with offline fallback
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithCache(request, PAGE_CACHE))
    return
  }
})

// ── Network first, cache fallback ──
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    const cached = await caches.match(request)
    if (cached) return cached
    // For page requests, return offline page
    if (request.headers.get("accept")?.includes("text/html")) {
      return caches.match("/") || new Response("Нет подключения к интернету", {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }
    return new Response(JSON.stringify({ error: "offline", offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// ── Cache first, network fallback ──
async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    return new Response("", { status: 503 })
  }
}

// ── Helpers ──
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)(\?.*)?$/.test(pathname) ||
    pathname.startsWith("/_next/static/")
}

// ── Background Sync: replay queued mutations ──
self.addEventListener("sync", (event) => {
  if (event.tag === "mutation-sync") {
    event.respondWith && event.waitUntil(replayMutations())
  }
})

async function replayMutations() {
  // Open IndexedDB and replay pending mutations
  const db = await openDB()
  const tx = db.transaction("mutations", "readwrite")
  const store = tx.objectStore("mutations")
  const all = await getAllFromStore(store)

  for (const mutation of all) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body,
      })
      if (response.ok || response.status < 500) {
        // Remove from queue on success or client error (won't retry)
        const deleteTx = db.transaction("mutations", "readwrite")
        deleteTx.objectStore("mutations").delete(mutation.id)
      }
    } catch (e) {
      // Network still down, stop trying
      break
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("questlegends-offline", 1)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains("mutations")) {
        db.createObjectStore("mutations", { keyPath: "id", autoIncrement: true })
      }
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" })
      }
    }
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ── Push notifications ──
self.addEventListener("push", (event) => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() } catch { data = { title: "Уведомление", body: event.data.text() } }

  const { title, body, icon, badge, url } = data

  event.waitUntil(
    self.registration.showNotification(title || "Легенда об Искателях", {
      body: body || "",
      icon: icon || "/icon-192.png",
      badge: badge || "/icon-192.png",
      data: { url: url || "/" },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Open new window
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// ── Listen for messages from the app ──
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
