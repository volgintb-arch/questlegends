/**
 * IndexedDB offline storage for QuestLegends PWA.
 * Stores API response caches and queued mutations for offline support.
 */

const DB_NAME = "questlegends-offline"
const DB_VERSION = 1

let dbInstance: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains("mutations")) {
        const store = db.createObjectStore("mutations", { keyPath: "id", autoIncrement: true })
        store.createIndex("timestamp", "timestamp")
      }
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" })
      }
    }

    request.onsuccess = (e) => {
      dbInstance = (e.target as IDBOpenDBRequest).result
      resolve(dbInstance)
    }

    request.onerror = (e) => {
      reject((e.target as IDBOpenDBRequest).error)
    }
  })
}

// ── Cache Store (for offline reads) ──

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction("cache", "readonly")
      const request = tx.objectStore("cache").get(key)
      request.onsuccess = () => {
        const result = request.result
        if (!result) return resolve(null)
        // Check TTL (30 minutes)
        if (Date.now() - result.timestamp > 30 * 60 * 1000) {
          resolve(null)
        } else {
          resolve(result.data as T)
        }
      }
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function setCachedData(key: string, data: unknown): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction("cache", "readwrite")
    tx.objectStore("cache").put({ key, data, timestamp: Date.now() })
  } catch {
    // Silently fail — cache is optional
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction("cache", "readwrite")
    tx.objectStore("cache").clear()
  } catch {
    // Silently fail
  }
}

// ── Mutation Queue (for offline writes) ──

export interface QueuedMutation {
  id?: number
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
  timestamp: number
  description: string // Human-readable description for UI
}

export async function queueMutation(mutation: Omit<QueuedMutation, "id" | "timestamp">): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction("mutations", "readwrite")
    tx.objectStore("mutations").add({
      ...mutation,
      timestamp: Date.now(),
    })
  } catch (e) {
    console.error("[PWA] Failed to queue mutation:", e)
    throw e
  }
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction("mutations", "readonly")
      const request = tx.objectStore("mutations").getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function removeMutation(id: number): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction("mutations", "readwrite")
    tx.objectStore("mutations").delete(id)
  } catch {
    // Silently fail
  }
}

export async function clearAllMutations(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction("mutations", "readwrite")
    tx.objectStore("mutations").clear()
  } catch {
    // Silently fail
  }
}

// ── Sync Engine ──

let isSyncing = false
let syncListeners: Array<(status: SyncStatus) => void> = []

export type SyncStatus = "idle" | "syncing" | "error" | "offline"

export function onSyncStatus(listener: (status: SyncStatus) => void) {
  syncListeners.push(listener)
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener)
  }
}

function notifyListeners(status: SyncStatus) {
  syncListeners.forEach((l) => l(status))
}

export async function syncMutations(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 }
  if (!navigator.onLine) {
    notifyListeners("offline")
    return { synced: 0, failed: 0 }
  }

  isSyncing = true
  notifyListeners("syncing")

  let synced = 0
  let failed = 0

  try {
    const mutations = await getPendingMutations()

    for (const mutation of mutations) {
      try {
        const response = await fetch(mutation.url, {
          method: mutation.method,
          headers: mutation.headers,
          body: mutation.body,
        })

        if (response.ok || (response.status >= 400 && response.status < 500)) {
          // Success or client error (don't retry client errors)
          await removeMutation(mutation.id!)
          synced++
        } else {
          // Server error — keep in queue for retry
          failed++
        }
      } catch {
        // Network error — stop trying
        failed++
        break
      }
    }

    notifyListeners(failed > 0 ? "error" : "idle")
  } catch {
    notifyListeners("error")
  } finally {
    isSyncing = false
  }

  return { synced, failed }
}
