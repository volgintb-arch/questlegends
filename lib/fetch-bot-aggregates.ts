/**
 * Fetches ad cost aggregates from the Yandex.Direct ROI bot.
 *
 * Bot endpoint:
 *   GET https://direct-bot.questlegends.ru/api/marketing/aggregates?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   Authorization: Bearer ${INTEGRATION_API_KEY}
 *
 * Expected response (current contract — adjust if bot changes shape):
 *   {
 *     from: string,
 *     to: string,
 *     currency: "RUB",
 *     totalCost: number,
 *     totalImpressions?: number,
 *     totalClicks?: number,
 *     byCampaign: [{ utmCampaign, utmSource, cost, impressions?, clicks? }],
 *     byContent:  [{ utmContent, utmCampaign?, cost, impressions?, clicks? }],
 *     bySource:   [{ utmSource, cost, impressions?, clicks? }]
 *   }
 *
 * Errors are returned softly (resolves with null) so the UI can show the report
 * without costs if the bot is down — instead of 500-ing the whole page.
 */

export interface BotCostBucket {
  cost: number
  impressions?: number
  clicks?: number
}

export interface BotAggregatesResponse {
  from: string
  to: string
  currency: "RUB"
  totalCost: number
  totalImpressions?: number
  totalClicks?: number
  byCampaign: Array<BotCostBucket & { utmCampaign: string; utmSource?: string }>
  byContent: Array<BotCostBucket & { utmContent: string; utmCampaign?: string }>
  bySource: Array<BotCostBucket & { utmSource: string }>
}

const DEFAULT_BOT_URL = "https://direct-bot.questlegends.ru"

export interface BotFetchResult {
  data: BotAggregatesResponse | null
  /** Human-readable reason for failure, null on success. */
  error: string | null
  /** URL that was actually called (for debugging). */
  url: string
}

export async function fetchBotAggregates(from: Date, to: Date): Promise<BotFetchResult> {
  const apiKey = process.env.INTEGRATION_API_KEY
  // Support both DIRECT_BOT_URL and BOT_URL env names
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
    const data = (await res.json()) as Partial<BotAggregatesResponse>
    if (!data || typeof data !== "object") {
      return { data: null, error: "Bot returned non-object body", url }
    }
    console.log(`[bot-aggregates] OK: totalCost=${data.totalCost}, byCampaign=${(data.byCampaign as any)?.length ?? 0}`)
    return {
      data: {
        from: String(data.from || fmt(from)),
        to: String(data.to || fmt(to)),
        currency: "RUB",
        totalCost: Number(data.totalCost) || 0,
        totalImpressions: typeof data.totalImpressions === "number" ? data.totalImpressions : undefined,
        totalClicks: typeof data.totalClicks === "number" ? data.totalClicks : undefined,
        byCampaign: Array.isArray(data.byCampaign) ? (data.byCampaign as any) : [],
        byContent: Array.isArray(data.byContent) ? (data.byContent as any) : [],
        bySource: Array.isArray(data.bySource) ? (data.bySource as any) : [],
      },
      error: null,
      url,
    }
  } catch (e: any) {
    const error = `fetch failed: ${e?.name === "AbortError" ? "timeout (10s)" : e?.message || String(e)}`
    console.warn(`[bot-aggregates] ${error}`)
    return { data: null, error, url }
  }
}
