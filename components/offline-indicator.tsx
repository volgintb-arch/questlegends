"use client"

import { useState, useEffect, useCallback } from "react"
import { Wifi, WifiOff, CloudUpload, AlertCircle, Check } from "lucide-react"
import { syncMutations, getPendingMutations, onSyncStatus, type SyncStatus } from "@/lib/offline-store"

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle")
  const [pendingCount, setPendingCount] = useState(0)
  const [showBanner, setShowBanner] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  const updatePendingCount = useCallback(async () => {
    const mutations = await getPendingMutations()
    setPendingCount(mutations.length)
  }, [])

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = async () => {
      setIsOnline(true)
      setShowBanner(true)
      // Auto-sync when back online
      const result = await syncMutations()
      await updatePendingCount()
      if (result.synced > 0) {
        setJustSynced(true)
        setTimeout(() => setJustSynced(false), 3000)
      }
      setTimeout(() => setShowBanner(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    const unsubscribe = onSyncStatus(setSyncStatus)
    updatePendingCount()

    // Periodic check for pending mutations
    const interval = setInterval(updatePendingCount, 10000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      unsubscribe()
      clearInterval(interval)
    }
  }, [updatePendingCount])

  const handleManualSync = async () => {
    if (!navigator.onLine) return
    await syncMutations()
    await updatePendingCount()
  }

  // Don't show anything when online, no pending, and not showing banner
  if (isOnline && pendingCount === 0 && !showBanner && !justSynced) {
    return null
  }

  return (
    <>
      {/* Offline banner — top of screen */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-600/90 backdrop-blur-sm text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
          <WifiOff className="h-4 w-4" />
          <span>Нет подключения к интернету. Изменения сохраняются локально.</span>
        </div>
      )}

      {/* Just came back online */}
      {isOnline && showBanner && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-green-600/90 backdrop-blur-sm text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
          <Wifi className="h-4 w-4" />
          <span>
            {justSynced ? "Подключение восстановлено. Данные синхронизированы!" : "Подключение восстановлено"}
          </span>
        </div>
      )}

      {/* Pending mutations indicator — bottom right */}
      {pendingCount > 0 && (
        <button
          onClick={handleManualSync}
          disabled={!isOnline || syncStatus === "syncing"}
          className="fixed bottom-4 right-4 z-[99] glass-card rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
        >
          {syncStatus === "syncing" ? (
            <>
              <CloudUpload className="h-4 w-4 animate-pulse text-primary" />
              <span>Синхронизация...</span>
            </>
          ) : syncStatus === "error" ? (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span>{pendingCount} в очереди</span>
            </>
          ) : !isOnline ? (
            <>
              <WifiOff className="h-4 w-4 text-yellow-500" />
              <span>{pendingCount} в очереди</span>
            </>
          ) : (
            <>
              <CloudUpload className="h-4 w-4 text-primary" />
              <span>Синхронизировать ({pendingCount})</span>
            </>
          )}
        </button>
      )}

      {/* Just synced toast */}
      {justSynced && pendingCount === 0 && (
        <div className="fixed bottom-4 right-4 z-[99] glass-card rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium text-green-500 animate-in fade-in duration-300">
          <Check className="h-4 w-4" />
          <span>Всё синхронизировано</span>
        </div>
      )}
    </>
  )
}
