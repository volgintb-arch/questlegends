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

export async function fetchBotAggregates(
  from: Date,
  to: Date,
): Promise<BotAggregatesResponse | null> {
  const apiKey = process.env.INTEGRATION_API_KEY
  if (!apiKey) {
    console.warn("[bot-aggregates] INTEGRATION_API_KEY not set — skipping cost fetch")
    return null
  }

  const baseUrl = (process.env.DIRECT_BOT_URL || DEFAULT_BOT_URL).replace(/\/$/, "")

  // Format as YYYY-MM-DD (bot expects date-only)
  const fmt = (d: Date) => d.toISOString().split("T")[0]
  const url = `${baseUrl}/api/marketing/aggregates?from=${fmt(from)}&to=${fmt(to)}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[bot-aggregates] non-OK response: ${res.status} ${res.statusText}`)
      return null
    }
    const data = (await res.json()) as Partial<BotAggregatesResponse>
    if (!data || typeof data !== "object") {
      return null
    }
    // Defensive normalization in case bot sends partial fields
    return {
      from: String(data.from || fmt(from)),
      to: String(data.to || fmt(to)),
      currency: "RUB",
      totalCost: Number(data.totalCost) || 0,
      totalImpressions: typeof data.totalImpressions === "number" ? data.totalImpressions : undefined,
      totalClicks: typeof data.totalClicks === "number" ? data.totalClicks : undefined,
      byCampaign: Array.isArray(data.byCampaign) ? (data.byCampaign as any) : [],
      byContent: Array.isArray(data.byContent) ? (data.byContent as any) : [],
      bySource: Array.isArray(data.bySource) ? (data.bySource as any) : [],
    }
  } catch (e: any) {
    console.warn("[bot-aggregates] fetch failed:", e?.message || e)
    return null
  }
}
