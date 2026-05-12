/**
 * Fetches ad cost aggregates from the Yandex.Direct ROI bot.
 *
 * Bot endpoint:
 *   GET https://direct-bot.questlegends.ru/api/marketing/aggregates?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   Authorization: Bearer ${INTEGRATION_API_KEY}
 *
 * Bot's actual response schema:
 *   {
 *     period: { from, to },
 *     totals: { cost, impressions, clicks, ctr, avgCpc },
 *     campaigns: [{ campaignId, name, type, city, state, cost, impressions, clicks, ctr, avgCpc }],
 *     ads: [{ adId, campaignId, adgroupId, title1, title2, text, url, cost, impressions?, clicks? }]
 *   }
 *
 * We normalize this to a flat shape that downstream code can consume by lead
 * matching keys (campaign name and adId).
 */

export interface BotCampaign {
  campaignId: number | string
  name: string
  type?: string
  state?: string
  cost: number
  impressions?: number
  clicks?: number
  ctr?: number
  avgCpc?: number
}

export interface BotAd {
  adId: number | string
  campaignId?: number | string
  title1?: string
  title2?: string
  text?: string
  url?: string
  cost: number
  impressions?: number
  clicks?: number
}

export interface BotAggregatesResponse {
  from: string
  to: string
  totalCost: number
  totalImpressions?: number
  totalClicks?: number
  campaigns: BotCampaign[]
  ads: BotAd[]
}

export interface BotFetchResult {
  data: BotAggregatesResponse | null
  error: string | null
  url: string
}

const DEFAULT_BOT_URL = "https://direct-bot.questlegends.ru"
const FETCH_TIMEOUT_MS = 30000 // 30s — wide date ranges may take time on bot side
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 min

// Process-level cache to avoid hammering the bot on every page render.
type CacheEntry = { at: number; result: BotFetchResult }
const aggregatesCache = new Map<string, CacheEntry>()

export async function fetchBotAggregates(from: Date, to: Date): Promise<BotFetchResult> {
  const apiKey = process.env.INTEGRATION_API_KEY
  const baseUrl = (process.env.DIRECT_BOT_URL || process.env.BOT_URL || DEFAULT_BOT_URL).replace(/\/$/, "")

  const fmt = (d: Date) => d.toISOString().split("T")[0]
  const url = `${baseUrl}/api/marketing/aggregates?from=${fmt(from)}&to=${fmt(to)}`
  const cacheKey = url

  // Serve cached result if fresh (and the cached result was successful)
  const cached = aggregatesCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS && cached.result.data) {
    const ageSec = Math.round((Date.now() - cached.at) / 1000)
    console.log(`[bot-aggregates] CACHE HIT (age ${ageSec}s) for ${url}`)
    return cached.result
  }

  if (!apiKey) {
    const error = "INTEGRATION_API_KEY is not set in QL OS env"
    console.warn(`[bot-aggregates] ${error}`)
    return { data: null, error, url }
  }

  const startedAt = Date.now()
  console.log(`[bot-aggregates] → outbound GET ${url} (key prefix: ${apiKey.slice(0, 6)}…, timeout ${FETCH_TIMEOUT_MS}ms)`)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "User-Agent": "QuestLegends-OS/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timeout)
    const elapsedMs = Date.now() - startedAt
    console.log(`[bot-aggregates] ← response in ${elapsedMs}ms: HTTP ${res.status} ${res.statusText}`)

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      const error = `Bot returned HTTP ${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`
      console.warn(`[bot-aggregates] ${error}`)
      return { data: null, error, url }
    }

    const rawBody = await res.text()
    let raw: any
    try {
      raw = JSON.parse(rawBody)
    } catch {
      console.warn(`[bot-aggregates] body is not JSON. Raw response (first 500 chars):\n${rawBody.slice(0, 500)}`)
      return { data: null, error: "Bot returned non-JSON body", url }
    }
    if (!raw || typeof raw !== "object") {
      return { data: null, error: "Bot returned non-object body", url }
    }

    // Bot's actual schema: totals.cost / campaigns / ads
    const totals = raw.totals || {}
    const period = raw.period || {}
    const data: BotAggregatesResponse = {
      from: String(period.from || fmt(from)),
      to: String(period.to || fmt(to)),
      totalCost: Number(totals.cost) || 0,
      totalImpressions: typeof totals.impressions === "number" ? totals.impressions : undefined,
      totalClicks: typeof totals.clicks === "number" ? totals.clicks : undefined,
      campaigns: Array.isArray(raw.campaigns)
        ? raw.campaigns.map((c: any) => ({
            campaignId: c.campaignId ?? c.id ?? "",
            name: String(c.name || ""),
            type: c.type,
            state: c.state,
            cost: Number(c.cost) || 0,
            impressions: typeof c.impressions === "number" ? c.impressions : undefined,
            clicks: typeof c.clicks === "number" ? c.clicks : undefined,
            ctr: typeof c.ctr === "number" ? c.ctr : undefined,
            avgCpc: typeof c.avgCpc === "number" ? c.avgCpc : undefined,
          }))
        : [],
      ads: Array.isArray(raw.ads)
        ? raw.ads.map((a: any) => ({
            adId: a.adId ?? a.id ?? "",
            campaignId: a.campaignId,
            title1: a.title1,
            title2: a.title2,
            text: a.text,
            url: a.url,
            cost: Number(a.cost) || 0,
            impressions: typeof a.impressions === "number" ? a.impressions : undefined,
            clicks: typeof a.clicks === "number" ? a.clicks : undefined,
          }))
        : [],
    }
    console.log(
      `[bot-aggregates] OK: totalCost=${data.totalCost}, campaigns=${data.campaigns.length}, ads=${data.ads.length}`,
    )
    const result: BotFetchResult = { data, error: null, url }
    aggregatesCache.set(cacheKey, { at: Date.now(), result })
    return result
  } catch (e: any) {
    const elapsedMs = Date.now() - startedAt
    const error = `fetch failed after ${elapsedMs}ms: ${e?.name === "AbortError" ? `timeout (${FETCH_TIMEOUT_MS / 1000}s)` : e?.message || String(e)}`
    console.warn(`[bot-aggregates] ${error}`)
    // If we have stale cached data, fall back to it rather than nothing
    if (cached && cached.result.data) {
      const ageSec = Math.round((Date.now() - cached.at) / 1000)
      console.log(`[bot-aggregates] returning STALE cache (age ${ageSec}s) after fetch error`)
      return cached.result
    }
    return { data: null, error, url }
  }
}
