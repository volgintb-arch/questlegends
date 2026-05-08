/**
 * Defensive extraction of ad-tracking parameters (yclid, gclid, utm_*, referrer)
 * from arbitrary webhook payloads — Marquiz, Tilda, Avito, VK, generic forms,
 * and any future integrations we add.
 *
 * Strategy (each step adds candidates, first non-empty wins):
 *   1. Walk the entire payload tree recursively. For each leaf:
 *      - if the key matches a tracking name (yclid / utm_source / etc) — collect value
 *      - if the value looks like a URL — parse it, extract query params
 *      - if the value looks like cookies ("a=1; b=2") — parse it
 *      - if the value looks like a query string ("a=1&b=2") — parse it
 *   2. Special "url-like" fields (href, referer, page url) get their search params
 *      merged in as a fallback.
 *
 * If a future integration puts a yclid in some unexpected place, the raw payload
 * gets saved into IncomingPayloadLog and we can either rely on the recursive
 * walk to pick it up automatically, or add an explicit path here.
 */

export interface TrackingData {
  yclid: string | null
  gclid: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  referrer: string | null
}

const EMPTY_TRACKING: TrackingData = {
  yclid: null,
  gclid: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  referrer: null,
}

// Map normalized key → field name in TrackingData
const KEY_MAP: Record<string, keyof TrackingData> = {
  yclid: "yclid",
  gclid: "gclid",
  utm_source: "utmSource",
  utmsource: "utmSource",
  utm_medium: "utmMedium",
  utmmedium: "utmMedium",
  utm_campaign: "utmCampaign",
  utmcampaign: "utmCampaign",
  utm_content: "utmContent",
  utmcontent: "utmContent",
  utm_term: "utmTerm",
  utmterm: "utmTerm",
  referrer: "referrer",
  referer: "referrer",
}

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[\s\-]+/g, "_")
}

function looksLikeUrl(v: string): boolean {
  return /^https?:\/\//i.test(v)
}

function looksLikeCookieString(v: string): boolean {
  // "a=1; b=2; c=3" — needs at least one ; and =
  return v.includes(";") && v.includes("=") && !v.includes("\n")
}

function looksLikeQueryString(v: string): boolean {
  // "a=1&b=2" — has & and = but doesn't start with http
  return v.includes("=") && (v.includes("&") || v.startsWith("?")) && !looksLikeUrl(v)
}

function parseCookieString(v: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pair of v.split(";")) {
    const idx = pair.indexOf("=")
    if (idx <= 0) continue
    const k = pair.slice(0, idx).trim()
    const val = pair.slice(idx + 1).trim()
    if (k && val) out[k] = val
  }
  return out
}

function parseQs(v: string): Record<string, string> {
  try {
    const params = new URLSearchParams(v.startsWith("?") ? v.slice(1) : v)
    const out: Record<string, string> = {}
    params.forEach((val, key) => {
      if (val) out[key] = val
    })
    return out
  } catch {
    return {}
  }
}

function parseUrl(v: string): { searchParams: Record<string, string>; full: string } | null {
  try {
    const u = new URL(v)
    const sp: Record<string, string> = {}
    u.searchParams.forEach((val, key) => {
      if (val) sp[key] = val
    })
    return { searchParams: sp, full: v }
  } catch {
    return null
  }
}

/**
 * Walks an object/array recursively, collecting tracking-relevant data:
 *   - direct key matches (yclid, utm_source, ...)
 *   - URLs whose search params we extract
 *   - cookie/qs strings whose pairs we extract
 *   - candidate referrer values (any URL-looking string)
 */
function walk(
  node: any,
  ctx: { result: TrackingData; referrerCandidates: Set<string>; depth: number },
) {
  if (!node || ctx.depth > 8) return
  if (typeof node === "string") {
    // Strings can carry URL/cookies/qs payloads — parse those as well
    if (looksLikeUrl(node)) {
      ctx.referrerCandidates.add(node)
      const parsed = parseUrl(node)
      if (parsed) {
        for (const [k, v] of Object.entries(parsed.searchParams)) {
          assignByKey(ctx.result, k, v)
        }
      }
    } else if (looksLikeQueryString(node)) {
      const pairs = parseQs(node)
      for (const [k, v] of Object.entries(pairs)) {
        assignByKey(ctx.result, k, v)
      }
    } else if (looksLikeCookieString(node)) {
      const cookies = parseCookieString(node)
      for (const [k, v] of Object.entries(cookies)) {
        assignByKey(ctx.result, k, v)
      }
    }
    return
  }
  if (typeof node !== "object") return

  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, { ...ctx, depth: ctx.depth + 1 })
    }
    return
  }

  for (const [rawKey, value] of Object.entries(node)) {
    // Direct key match — assign the value
    assignByKey(ctx.result, rawKey, value)

    // Recurse into objects/arrays/strings
    walk(value, { ...ctx, depth: ctx.depth + 1 })
  }
}

function assignByKey(result: TrackingData, rawKey: string, value: any) {
  const norm = normalizeKey(rawKey)
  const target = KEY_MAP[norm]
  if (!target) return
  if (value === null || value === undefined) return
  const str = typeof value === "string" ? value.trim() : String(value).trim()
  if (!str) return
  // First match wins — don't overwrite once set
  if (result[target]) return
  result[target] = str
}

export function extractTracking(payload: any): TrackingData {
  if (!payload || typeof payload !== "object") return { ...EMPTY_TRACKING }

  const result: TrackingData = { ...EMPTY_TRACKING }
  const referrerCandidates = new Set<string>()

  walk(payload, { result, referrerCandidates, depth: 0 })

  // If referrer wasn't picked up by direct match, fall back to any URL we saw
  if (!result.referrer && referrerCandidates.size > 0) {
    // Prefer one with utm/yclid in it; otherwise just first
    const sorted = Array.from(referrerCandidates).sort((a, b) => {
      const score = (s: string) => (
        (s.includes("yclid=") ? 4 : 0) +
        (s.includes("gclid=") ? 4 : 0) +
        (s.includes("utm_") ? 2 : 0)
      )
      return score(b) - score(a)
    })
    result.referrer = sorted[0]
  }

  return result
}
