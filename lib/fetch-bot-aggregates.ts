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

export async function fetchBotAggregates(from: Date, to: Date): Promise<BotFetchResult> {
  const apiKey = process.env.INTEGRATION_API_KEY
  const baseUrl = (process.env.DIRECT_BOT_URL || process.env.BOT_URL || DEFAULT_BOT_URL).replace(/\/$/, "")

  const fmt = (d: Date) => d.toISOString().split("T")[0]
  const url = `${baseUrl}/api/marketing/aggregates?from=${fmt(from)}&to=${fmt(to)}`

  if (!apiKey) {
    const error = "INTEGRATION_API_KEY is not set in QL OS env"
    console.warn(`[bot-aggregates] ${error}`)
    return { data: null, error, url }
  }

  console.log(`[bot-aggregates] fetching ${url} (key prefix: ${apiKey.slice(0, 6)}…)`)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

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
    return { data, error: null, url }
  } catch (e: any) {
    const error = `fetch failed: ${e?.name === "AbortError" ? "timeout (10s)" : e?.message || String(e)}`
    console.warn(`[bot-aggregates] ${error}`)
    return { data: null, error, url }
  }
}
