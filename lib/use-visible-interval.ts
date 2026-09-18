"use client"

import { useEffect, useRef } from "react"

/**
 * setInterval that ticks only while the tab is visible, and fires once as soon
 * as the tab becomes visible again. Every open background tab used to poll the
 * API at full rate (badge counter every 10s, chat every 5s, UK dashboard every 30s).
 */
export function useVisibleInterval(callback: () => void, ms: number, enabled = true) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    if (!enabled) return
    const tick = () => {
      if (document.visibilityState === "visible") cbRef.current()
    }
    const id = setInterval(tick, ms)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [ms, enabled])
}
