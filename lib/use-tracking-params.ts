"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "ql_tracking_v1"
const FIRST_TOUCH_KEY = "ql_tracking_first_touch_v1"

export interface TrackingParams {
  yclid: string | null
  gclid: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  referrer: string | null
}

const EMPTY: TrackingParams = {
  yclid: null,
  gclid: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  referrer: null,
}

function readFromUrl(): TrackingParams | null {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  const t: TrackingParams = {
    yclid: params.get("yclid"),
    gclid: params.get("gclid"),
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
    referrer: document.referrer || null,
  }
  // If at least one tracking value is present, return it; otherwise null
  const hasAny = Object.entries(t).some(([k, v]) => k !== "referrer" && v)
  return hasAny ? t : null
}

/**
 * Captures ad-tracking params from the current URL on mount and stores them
 * in sessionStorage so they survive navigation. First-touch attribution is
 * stored separately in localStorage and never overwritten.
 *
 * Use the return value (latest touch) when creating leads — bot/manual.
 */
export function useTrackingParams(): TrackingParams {
  const [tracking, setTracking] = useState<TrackingParams>(EMPTY)

  useEffect(() => {
    if (typeof window === "undefined") return

    const fromUrl = readFromUrl()
    if (fromUrl) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl))
        if (!localStorage.getItem(FIRST_TOUCH_KEY)) {
          localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(fromUrl))
        }
      } catch {
        // ignore quota / privacy errors
      }
      setTracking(fromUrl)
      return
    }

    try {
      const cached = sessionStorage.getItem(STORAGE_KEY)
      if (cached) {
        setTracking(JSON.parse(cached))
        return
      }
      const firstTouch = localStorage.getItem(FIRST_TOUCH_KEY)
      if (firstTouch) {
        setTracking(JSON.parse(firstTouch))
      }
    } catch {
      // ignore
    }
  }, [])

  return tracking
}

/**
 * Strips null fields so the API gets only what's set.
 */
export function trackingForApi(t: TrackingParams): Partial<TrackingParams> {
  const out: Partial<TrackingParams> = {}
  for (const [k, v] of Object.entries(t)) {
    if (v) (out as any)[k] = v
  }
  return out
}
