import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyRequest } from "@/lib/simple-auth"
import { logApiError } from "@/lib/app-logger"
import { fetchBotAggregates } from "@/lib/fetch-bot-aggregates"

/**
 * Ads-only marketing report.
 *
 * A lead is "ads-driven" if it has yclid OR gclid OR utm_source set.
 * Set strict=1 to only include leads with yclid OR gclid (precise attribution).
 *
 * Query params:
 *   dateFrom, dateTo
 *   franchiseeId  (UK only)
 *   type = "all" | "b2b" | "b2c"
 *   strict = "1" → only yclid/gclid
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sp = req.nextUrl.searchParams
    const dateFrom = sp.get("dateFrom")
    const dateTo = sp.get("dateTo")
    const type = sp.get("type") || "all"
    const strict = sp.get("strict") === "1"

    const isUK = ["uk", "super_admin", "uk_employee"].includes(user.role)
    const franchiseeParam = sp.get("franchiseeId")
    const franchiseeFilter = isUK
      ? (franchiseeParam && franchiseeParam !== "all" ? franchiseeParam : null)
      : user.franchiseeId || null

    const df = dateFrom ? new Date(dateFrom) : null
    const dt = dateTo ? new Date(dateTo + "T23:59:59.999Z") : null

    function normalizeStatus(
      stType: string | null,
      stName: string | null,
    ): "new" | "in_progress" | "approved" | "completed" | "cancelled" {
      if (stType === "cancelled" || stType === "lost") return "cancelled"
      if (stType === "completed" || stType === "won") return "completed"
      if (stType === "scheduled") return "approved"
      if (stType === "new") return "new"
      if (stType === "in_progress") return "in_progress"
      const n = (stName || "").toLowerCase()
      if (n.includes("отказ") || n.includes("отмен")) return "cancelled"
      if (n.includes("заверш") || n.includes("успе") || n.includes("выполн")) return "completed"
      if (n.includes("согласов")) return "approved"
      if (n.includes("нов")) return "new"
      return "in_progress"
    }

    type Row = {
      id: string
      kind: "b2c" | "b2b"
      clientName: string
      clientPhone: string | null
      createdAt: string
      currentStage: string | null
      status: "new" | "in_progress" | "approved" | "completed" | "cancelled"
      cancellationReason: string | null
      amount: number
      franchiseeName: string | null
      pipelineId: string | null
      yclid: string | null
      gclid: string | null
      utmSource: string | null
      utmMedium: string | null
      utmCampaign: string | null
      utmContent: string | null
      utmTerm: string | null
      referrer: string | null
    }

    const rows: Row[] = []

    // Check if columns exist (defensive — covers DBs that haven't run the migration)
    const hasGameAdCols = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'GameLead' AND column_name = 'yclid' LIMIT 1
    `
    const hasDealAdCols = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Deal' AND column_name = 'yclid' LIMIT 1
    `

    const stageType = (s: any) => s as string | null

    if ((type === "all" || type === "b2c") && hasGameAdCols.length > 0) {
      const leads = await sql`
        SELECT
          gl.id, gl."clientName", gl."clientPhone", gl."createdAt",
          gl."totalAmount" AS amount, gl."pipelineId",
          gl."cancellationReason",
          gl."yclid", gl."gclid", gl."utmSource", gl."utmMedium", gl."utmCampaign",
          gl."utmContent", gl."utmTerm", gl."referrer",
          s.name AS "stageName", s."stageType",
          f.name AS "franchiseeName"
        FROM "GameLead" gl
        LEFT JOIN "GamePipelineStage" s ON gl."stageId" = s.id
        LEFT JOIN "Franchisee" f ON gl."franchiseeId" = f.id
        WHERE (
          gl."yclid" IS NOT NULL
          OR gl."gclid" IS NOT NULL
          ${strict ? sql`` : sql`OR gl."utmSource" IS NOT NULL`}
        )
          AND (${df}::timestamptz IS NULL OR gl."createdAt" >= ${df})
          AND (${dt}::timestamptz IS NULL OR gl."createdAt" <= ${dt})
          AND (${franchiseeFilter}::text IS NULL OR gl."franchiseeId" = ${franchiseeFilter})
        ORDER BY gl."createdAt" DESC
        LIMIT 5000
      `
      for (const l of leads as any[]) {
        rows.push({
          id: l.id,
          kind: "b2c",
          clientName: l.clientName || "",
          clientPhone: l.clientPhone || null,
          createdAt: l.createdAt,
          currentStage: l.stageName || null,
          status: normalizeStatus(stageType(l.stageType), l.stageName),
          cancellationReason: l.cancellationReason || null,
          amount: Number(l.amount) || 0,
          franchiseeName: l.franchiseeName || null,
          pipelineId: l.pipelineId || null,
          yclid: l.yclid || null,
          gclid: l.gclid || null,
          utmSource: l.utmSource || null,
          utmMedium: l.utmMedium || null,
          utmCampaign: l.utmCampaign || null,
          utmContent: l.utmContent || null,
          utmTerm: l.utmTerm || null,
          referrer: l.referrer || null,
        })
      }
    }

    if ((type === "all" || type === "b2b") && hasDealAdCols.length > 0) {
      const deals = await sql`
        SELECT
          d.id,
          COALESCE(d."contactName", d."clientName") AS "clientName",
          COALESCE(d."contactPhone", d."clientPhone") AS "clientPhone",
          d."createdAt",
          COALESCE(d.budget, 0) AS amount,
          d."pipelineId",
          d."cancellationReason",
          d."yclid", d."gclid", d."utmSource", d."utmMedium", d."utmCampaign",
          d."utmContent", d."utmTerm", d."referrer",
          s.name AS "stageName", s."stageType",
          f.name AS "franchiseeName"
        FROM "Deal" d
        LEFT JOIN "PipelineStage" s ON d."stageId" = s.id
        LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
        WHERE (
          d."yclid" IS NOT NULL
          OR d."gclid" IS NOT NULL
          ${strict ? sql`` : sql`OR d."utmSource" IS NOT NULL`}
        )
          AND (${df}::timestamptz IS NULL OR d."createdAt" >= ${df})
          AND (${dt}::timestamptz IS NULL OR d."createdAt" <= ${dt})
          AND (${franchiseeFilter}::text IS NULL OR d."franchiseeId" = ${franchiseeFilter})
        ORDER BY d."createdAt" DESC
        LIMIT 5000
      `
      for (const d of deals as any[]) {
        rows.push({
          id: d.id,
          kind: "b2b",
          clientName: d.clientName || "",
          clientPhone: d.clientPhone || null,
          createdAt: d.createdAt,
          currentStage: d.stageName || null,
          status: normalizeStatus(stageType(d.stageType), d.stageName),
          cancellationReason: d.cancellationReason || null,
          amount: Number(d.amount) || 0,
          franchiseeName: d.franchiseeName || null,
          pipelineId: d.pipelineId || null,
          yclid: d.yclid || null,
          gclid: d.gclid || null,
          utmSource: d.utmSource || null,
          utmMedium: d.utmMedium || null,
          utmCampaign: d.utmCampaign || null,
          utmContent: d.utmContent || null,
          utmTerm: d.utmTerm || null,
          referrer: d.referrer || null,
        })
      }
    }

    type AggBucket = {
      total: number
      new: number
      inProgress: number
      approved: number
      completed: number
      cancelled: number
      revenue: number
    }
    const emptyBucket = (): AggBucket => ({
      total: 0, new: 0, inProgress: 0, approved: 0, completed: 0, cancelled: 0, revenue: 0,
    })

    const totals = emptyBucket()
    const byCampaign = new Map<string, AggBucket & { utmCampaign: string; utmSource: string }>()
    const byContent = new Map<string, AggBucket & { utmContent: string; utmCampaign: string }>()
    const bySource = new Map<string, AggBucket & { utmSource: string }>()
    const reasonCounts = new Map<string, { reason: string; count: number; campaigns: Set<string> }>()

    function pushTo(bucket: AggBucket, r: Row) {
      bucket.total++
      if (r.status === "new") bucket.new++
      else if (r.status === "in_progress") bucket.inProgress++
      else if (r.status === "approved") bucket.approved++
      else if (r.status === "completed") {
        bucket.completed++
        bucket.revenue += r.amount
      } else if (r.status === "cancelled") bucket.cancelled++
    }

    for (const r of rows) {
      pushTo(totals, r)

      const campaignKey = r.utmCampaign || "(без кампании)"
      const sourceKey = r.utmSource || (r.yclid ? "yandex" : r.gclid ? "google" : "(без источника)")
      const compositeCampaign = `${campaignKey}__${sourceKey}`

      if (!byCampaign.has(compositeCampaign)) {
        byCampaign.set(compositeCampaign, { ...emptyBucket(), utmCampaign: campaignKey, utmSource: sourceKey })
      }
      pushTo(byCampaign.get(compositeCampaign)!, r)

      const contentKey = r.utmContent || "(без объявления)"
      const compositeContent = `${contentKey}__${campaignKey}`
      if (!byContent.has(compositeContent)) {
        byContent.set(compositeContent, { ...emptyBucket(), utmContent: contentKey, utmCampaign: campaignKey })
      }
      pushTo(byContent.get(compositeContent)!, r)

      if (!bySource.has(sourceKey)) {
        bySource.set(sourceKey, { ...emptyBucket(), utmSource: sourceKey })
      }
      pushTo(bySource.get(sourceKey)!, r)

      if (r.status === "cancelled" && r.cancellationReason) {
        const reason = r.cancellationReason.trim()
        if (!reasonCounts.has(reason)) {
          reasonCounts.set(reason, { reason, count: 0, campaigns: new Set() })
        }
        const x = reasonCounts.get(reason)!
        x.count++
        x.campaigns.add(campaignKey)
      }
    }

    const conversionPct = (b: AggBucket) => (b.total > 0 ? +((b.completed / b.total) * 100).toFixed(1) : 0)
    const avgCheck = (b: AggBucket) => (b.completed > 0 ? Math.round(b.revenue / b.completed) : 0)

    // Fetch ad cost aggregates from the Yandex.Direct ROI bot.
    // ALWAYS try — if user picked "all time" with no dates, default to last 90 days
    // so we still get real cost data for the report.
    const botFrom = df ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const botTo = dt ?? new Date()
    const botResult = await fetchBotAggregates(botFrom, botTo)
    const botCosts = botResult.data
    const botError = botResult.error
    const botUrl = botResult.url

    const costByCampaign = new Map<string, number>()
    const costByContent = new Map<string, number>()
    const costBySource = new Map<string, number>()
    if (botCosts) {
      for (const c of botCosts.byCampaign || []) {
        const key = `${c.utmCampaign || "(без кампании)"}__${c.utmSource || "(без источника)"}`
        costByCampaign.set(key, (costByCampaign.get(key) || 0) + (Number(c.cost) || 0))
      }
      for (const c of botCosts.byContent || []) {
        const key = `${c.utmContent || "(без объявления)"}__${c.utmCampaign || "(без кампании)"}`
        costByContent.set(key, (costByContent.get(key) || 0) + (Number(c.cost) || 0))
      }
      for (const c of botCosts.bySource || []) {
        const key = c.utmSource || "(без источника)"
        costBySource.set(key, (costBySource.get(key) || 0) + (Number(c.cost) || 0))
      }
    }

    const cpl = (cost: number, leads: number) => (leads > 0 && cost > 0 ? Math.round(cost / leads) : null)
    const roas = (cost: number, revenue: number) => (cost > 0 ? +((revenue / cost) * 100).toFixed(1) : null)
    const roi = (cost: number, revenue: number) => (cost > 0 ? +(((revenue - cost) / cost) * 100).toFixed(1) : null)

    const enrich = <T extends AggBucket>(b: T, costMap: Map<string, number>, key: string) => {
      const cost = costMap.get(key) || 0
      return {
        ...b,
        conversionPct: conversionPct(b),
        avgCheck: avgCheck(b),
        cost,
        cpl: cpl(cost, b.total),
        roas: roas(cost, b.revenue),
        roi: roi(cost, b.revenue),
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          ...totals,
          conversionPct: conversionPct(totals),
          avgCheck: avgCheck(totals),
          cost: botCosts?.totalCost || 0,
          cpl: cpl(botCosts?.totalCost || 0, totals.total),
          roas: roas(botCosts?.totalCost || 0, totals.revenue),
          roi: roi(botCosts?.totalCost || 0, totals.revenue),
          impressions: botCosts?.totalImpressions ?? null,
          clicks: botCosts?.totalClicks ?? null,
        },
        byCampaign: Array.from(byCampaign.entries())
          .map(([key, b]) => enrich(b, costByCampaign, key))
          .sort((a, b) => b.total - a.total),
        byContent: Array.from(byContent.entries())
          .map(([key, b]) => enrich(b, costByContent, key))
          .sort((a, b) => b.total - a.total),
        bySource: Array.from(bySource.entries())
          .map(([key, b]) => enrich(b, costBySource, key))
          .sort((a, b) => b.total - a.total),
        cancellationReasons: Array.from(reasonCounts.values())
          .map((r) => ({ reason: r.reason, count: r.count, campaigns: Array.from(r.campaigns) }))
          .sort((a, b) => b.count - a.count),
        leads: rows,
        costsAvailable: botCosts !== null,
        botStatus: {
          url: botUrl,
          ok: botCosts !== null,
          error: botError,
        },
      },
    })
  } catch (error) {
    console.error("[v0] marketing/ads-report error:", error)
    await logApiError(error, req).catch(() => {})
    return NextResponse.json({ error: "Failed to fetch ads report" }, { status: 500 })
  }
}
