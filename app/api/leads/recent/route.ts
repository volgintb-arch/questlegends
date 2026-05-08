/**
 * GET /api/leads/recent?from=ISO&to=ISO[&utm_source=yandex][&type=b2b|b2c]
 *
 * Server-to-server endpoint для бота Яндекс.Директ.
 * Бот дёргает каждые 4ч и агрегирует ROI per ad.
 *
 * Auth: Authorization: Bearer ${INTEGRATION_API_KEY}
 *
 * Возвращает все лиды за период (включая поля yclid, gclid, utm_*, status,
 * revenue, city, leadType, scheduledAt, completedAt, cancelledAt).
 *
 * Ищет в обеих таблицах: Deal (B2B) и GameLead (B2C). leadType различает.
 *
 * Лимит: до 5000 записей за запрос. Если за период больше — бот должен сужать
 * период или фильтровать по utm_source.
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { logApiError } from "@/lib/app-logger"
import { checkIntegrationAuth } from "@/lib/integration-auth"

type Status = "new" | "in_progress" | "scheduled" | "completed" | "cancelled"

function statusFromStage(stType: string | null, stName: string | null): Status {
  if (stType === "cancelled" || stType === "lost") return "cancelled"
  if (stType === "completed" || stType === "won") return "completed"
  if (stType === "scheduled") return "scheduled"
  if (stType === "new") return "new"
  if (stType === "in_progress") return "in_progress"
  const n = (stName || "").toLowerCase()
  if (n.includes("отказ") || n.includes("отмен")) return "cancelled"
  if (n.includes("заверш") || n.includes("успе") || n.includes("выполн")) return "completed"
  if (n.includes("согласов")) return "scheduled"
  if (n.includes("нов")) return "new"
  return "in_progress"
}

const MAX_LIMIT = 5000

export async function GET(req: NextRequest) {
  try {
    const authError = checkIntegrationAuth(req)
    if (authError) return authError

    const sp = req.nextUrl.searchParams
    const fromStr = sp.get("from")
    const toStr = sp.get("to")
    if (!fromStr) {
      return NextResponse.json({ error: "Query param 'from' is required (ISO date)" }, { status: 400 })
    }

    const from = new Date(fromStr)
    const to = toStr ? new Date(toStr) : new Date()
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid 'from' or 'to' date format" }, { status: 400 })
    }

    const utmSourceFilter = sp.get("utm_source") || null
    const utmCampaignFilter = sp.get("utm_campaign") || null
    const typeFilter = sp.get("type") // "b2b" | "b2c" | null
    const limit = Math.min(Number.parseInt(sp.get("limit") || String(MAX_LIMIT), 10) || MAX_LIMIT, MAX_LIMIT)

    // Defensive: ad-tracking columns may not exist on a stale DB
    const hasGameAdCols = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'GameLead' AND column_name = 'yclid' LIMIT 1
    `
    const hasDealAdCols = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Deal' AND column_name = 'yclid' LIMIT 1
    `

    type Lead = {
      leadId: string
      leadType: "b2b" | "b2c"
      clientName: string
      clientPhone: string | null
      city: string | null
      source: string | null
      status: Status
      revenue: number
      currency: "RUB"
      yclid: string | null
      gclid: string | null
      utm_source: string | null
      utm_medium: string | null
      utm_campaign: string | null
      utm_content: string | null
      utm_term: string | null
      referrer: string | null
      payloadLogId: string | null
      cancellationReason: string | null
      currentStageName: string | null
      currentStageType: string | null
      createdAt: string
      scheduledAt: string | null
      completedAt: string | null
      cancelledAt: string | null
      franchiseeId: string | null
      franchiseeName: string | null
    }

    const leads: Lead[] = []

    if ((typeFilter === null || typeFilter === "b2c") && hasGameAdCols.length > 0) {
      const rows = await sql`
        SELECT
          gl.id, gl."clientName", gl."clientPhone",
          gl.source, gl."totalAmount" AS amount,
          gl."yclid", gl."gclid",
          gl."utmSource", gl."utmMedium", gl."utmCampaign", gl."utmContent", gl."utmTerm",
          gl."referrer", gl."payloadLogId", gl."cancellationReason",
          gl."createdAt", gl."scheduledAt", gl."completedAt", gl."cancelledAt",
          gl."franchiseeId",
          s.name AS "stageName", s."stageType",
          f.name AS "franchiseeName", f.city AS "franchiseeCity"
        FROM "GameLead" gl
        LEFT JOIN "GamePipelineStage" s ON gl."stageId" = s.id
        LEFT JOIN "Franchisee" f ON gl."franchiseeId" = f.id
        WHERE gl."createdAt" >= ${from}
          AND gl."createdAt" <= ${to}
          AND (${utmSourceFilter}::text IS NULL OR gl."utmSource" = ${utmSourceFilter})
          AND (${utmCampaignFilter}::text IS NULL OR gl."utmCampaign" = ${utmCampaignFilter})
        ORDER BY gl."createdAt" DESC
        LIMIT ${limit}
      `
      for (const r of rows as any[]) {
        leads.push({
          leadId: r.id,
          leadType: "b2c",
          clientName: r.clientName || "",
          clientPhone: r.clientPhone || null,
          city: r.franchiseeCity || null,
          source: r.source || null,
          status: statusFromStage(r.stageType, r.stageName),
          revenue: Number(r.amount) || 0,
          currency: "RUB",
          yclid: r.yclid || null,
          gclid: r.gclid || null,
          utm_source: r.utmSource || null,
          utm_medium: r.utmMedium || null,
          utm_campaign: r.utmCampaign || null,
          utm_content: r.utmContent || null,
          utm_term: r.utmTerm || null,
          referrer: r.referrer || null,
          payloadLogId: r.payloadLogId || null,
          cancellationReason: r.cancellationReason || null,
          currentStageName: r.stageName || null,
          currentStageType: r.stageType || null,
          createdAt: r.createdAt,
          scheduledAt: r.scheduledAt || null,
          completedAt: r.completedAt || null,
          cancelledAt: r.cancelledAt || null,
          franchiseeId: r.franchiseeId || null,
          franchiseeName: r.franchiseeName || null,
        })
      }
    }

    if ((typeFilter === null || typeFilter === "b2b") && hasDealAdCols.length > 0) {
      const rows = await sql`
        SELECT
          d.id,
          COALESCE(d."contactName", d."clientName") AS "clientName",
          COALESCE(d."contactPhone", d."clientPhone") AS "clientPhone",
          d.city,
          COALESCE(d."leadSource", d.source) AS source,
          COALESCE(d.budget, 0) AS amount,
          d."yclid", d."gclid",
          d."utmSource", d."utmMedium", d."utmCampaign", d."utmContent", d."utmTerm",
          d."referrer", d."payloadLogId", d."cancellationReason",
          d."createdAt", d."scheduledAt", d."completedAt", d."cancelledAt",
          d."franchiseeId",
          s.name AS "stageName", s."stageType",
          f.name AS "franchiseeName"
        FROM "Deal" d
        LEFT JOIN "PipelineStage" s ON d."stageId" = s.id
        LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
        WHERE d."createdAt" >= ${from}
          AND d."createdAt" <= ${to}
          AND (${utmSourceFilter}::text IS NULL OR d."utmSource" = ${utmSourceFilter})
          AND (${utmCampaignFilter}::text IS NULL OR d."utmCampaign" = ${utmCampaignFilter})
        ORDER BY d."createdAt" DESC
        LIMIT ${limit}
      `
      for (const r of rows as any[]) {
        leads.push({
          leadId: r.id,
          leadType: "b2b",
          clientName: r.clientName || "",
          clientPhone: r.clientPhone || null,
          city: r.city || null,
          source: r.source || null,
          status: statusFromStage(r.stageType, r.stageName),
          revenue: Number(r.amount) || 0,
          currency: "RUB",
          yclid: r.yclid || null,
          gclid: r.gclid || null,
          utm_source: r.utmSource || null,
          utm_medium: r.utmMedium || null,
          utm_campaign: r.utmCampaign || null,
          utm_content: r.utmContent || null,
          utm_term: r.utmTerm || null,
          referrer: r.referrer || null,
          payloadLogId: r.payloadLogId || null,
          cancellationReason: r.cancellationReason || null,
          currentStageName: r.stageName || null,
          currentStageType: r.stageType || null,
          createdAt: r.createdAt,
          scheduledAt: r.scheduledAt || null,
          completedAt: r.completedAt || null,
          cancelledAt: r.cancelledAt || null,
          franchiseeId: r.franchiseeId || null,
          franchiseeName: r.franchiseeName || null,
        })
      }
    }

    leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      from: from.toISOString(),
      to: to.toISOString(),
      total: leads.length,
      truncated: leads.length >= limit,
      leads,
    })
  } catch (error) {
    console.error("[leads/recent] error:", error)
    await logApiError(error, req).catch(() => {})
    return NextResponse.json({ error: "Failed to fetch recent leads" }, { status: 500 })
  }
}
