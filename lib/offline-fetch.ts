/**
 * Offline-aware fetch wrapper.
 * GET requests: try network → fallback to IndexedDB cache.
 * Mutations (POST/PUT/PATCH/DELETE): if offline → queue in IndexedDB.
 */

import { getCachedData, setCachedData, queueMutation } from "./offline-store"

interface OfflineFetchOptions extends RequestInit {
  /** Human-readable description for the pending mutations UI */
  offlineDescription?: string
  /** Skip offline handling (e.g. for auth requests) */
  skipOffline?: boolean
}

export async function offlineFetch(
  url: string,
  options: OfflineFetchOptions = {}
): Promise<Response> {
  const { offlineDescription, skipOffline, ...fetchOptions } = options
  const method = (fetchOptions.method || "GET").toUpperCase()

  // Skip offline handling if requested
  if (skipOffline) {
    return fetch(url, fetchOptions)
  }

  // ── GET requests: network-first with cache fallback ──
  if (method === "GET") {
    if (navigator.onLine) {
      try {
        const response = await fetch(url, fetchOptions)
        if (response.ok) {
          // Cache the successful response
          const data = await response.clone().json().catch(() => null)
          if (data) {
            await setCachedData(url, data)
          }
        }
        return response
      } catch {
        // Network failed, try cache
        return getFromCache(url)
      }
    } else {
      // Offline — use cache
      return getFromCache(url)
    }
  }

  // ── Mutation requests (POST/PUT/PATCH/DELETE) ──
  if (navigator.onLine) {
    try {
      return await fetch(url, fetchOptions)
    } catch {
      // Network failed mid-request — queue it
      await queueForLater(url, method, fetchOptions, offlineDescription)
      return createQueuedResponse(offlineDescription)
    }
  } else {
    // Offline — queue the mutation
    await queueForLater(url, method, fetchOptions, offlineDescription)
    return createQueuedResponse(offlineDescription)
  }
}

async function getFromCache(url: string): Promise<Response> {
  const cached = await getCachedData(url)
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-From-Cache": "true",
      },
    })
  }
  return new Response(JSON.stringify({ error: "offline", offline: true }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  })
}

async function queueForLater(
  url: string,
  method: string,
  options: RequestInit,
  description?: string
): Promise<void> {
  const headers: Record<string, string> = {}
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => { headers[k] = v })
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => { headers[k] = v })
    } else {
      Object.assign(headers, options.headers)
    }
  }

  await queueMutation({
    url,
    method,
    headers,
    body: typeof options.body === "string" ? options.body : null,
    description: description || `${method} ${url}`,
  })
}

function createQueuedResponse(description?: string): Response {
  return new Response(
    JSON.stringify({
      queued: true,
      message: "Действие сохранено и будет выполнено при появлении интернета",
      description,
    }),
    {
      status: 202, // Accepted
      headers: {
        "Content-Type": "application/json",
        "X-Queued-Offline": "true",
      },
    }
  )
}
