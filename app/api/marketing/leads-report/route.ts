import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyRequest } from "@/lib/simple-auth"
import { logApiError } from "@/lib/app-logger"

/**
 * Unified marketing report: B2B deals + B2C game leads grouped by source.
 * Returns status (confirmed/in_progress/cancelled), cancellation reason, revenue.
 *
 * Query params:
 *   source     — filter by source (marquiz, avito, etc.) or "all"
 *   dateFrom   — filter created date >= (YYYY-MM-DD)
 *   dateTo     — filter created date <= (YYYY-MM-DD)
 *   type       — "b2b" | "b2c" | "all" (default "all")
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sp = req.nextUrl.searchParams
    const source = sp.get("source") || "all"
    const dateFrom = sp.get("dateFrom")
    const dateTo = sp.get("dateTo")
    const type = sp.get("type") || "all"

    const isUK = ["uk", "super_admin", "uk_employee"].includes(user.role)
    const franchiseeParam = sp.get("franchiseeId")
    // UK can filter by specific franchisee via query param; others forced to their own
    const franchiseeFilter = isUK
      ? (franchiseeParam && franchiseeParam !== "all" ? franchiseeParam : null)
      : user.franchiseeId || null

    const srcFilter = source === "all" ? null : source
    const df = dateFrom ? new Date(dateFrom) : null
    const dt = dateTo ? new Date(dateTo + "T23:59:59.999Z") : null

    type Row = {
      id: string
      kind: "b2c" | "b2b"
      clientName: string
      clientPhone: string | null
      source: string | null
      createdAt: string
      currentStage: string | null
      stageType: string | null
      status: "confirmed" | "in_progress" | "cancelled"
      cancellationReason: string | null
      amount: number
      franchiseeName: string | null
    }

    const rows: Row[] = []

    // B2C — GameLead
    if (type === "all" || type === "b2c") {
      const leads = await sql`
        SELECT
          gl.id,
          gl."clientName" AS "clientName",
          gl."clientPhone" AS "clientPhone",
          gl.source AS source,
          gl."createdAt" AS "createdAt",
          gl."totalAmount" AS amount,
          gl."cancellationReason" AS "cancellationReason",
          s.name AS "stageName",
          s."stageType" AS "stageType",
          f.name AS "franchiseeName"
        FROM "GameLead" gl
        LEFT JOIN "GamePipelineStage" s ON gl."stageId" = s.id
        LEFT JOIN "Franchisee" f ON gl."franchiseeId" = f.id
        WHERE (${srcFilter}::text IS NULL OR gl.source = ${srcFilter})
          AND (${df}::timestamptz IS NULL OR gl."createdAt" >= ${df})
          AND (${dt}::timestamptz IS NULL OR gl."createdAt" <= ${dt})
          AND (${franchiseeFilter}::text IS NULL OR gl."franchiseeId" = ${franchiseeFilter})
        ORDER BY gl."createdAt" DESC
        LIMIT 5000
      `
      for (const l of leads as any[]) {
        const stType = l.stageType as string | null
        const status: Row["status"] = stType === "completed" ? "confirmed" : stType === "cancelled" ? "cancelled" : "in_progress"
        rows.push({
          id: l.id,
          kind: "b2c",
          clientName: l.clientName || "",
          clientPhone: l.clientPhone || null,
          source: l.source || null,
          createdAt: l.createdAt,
          currentStage: l.stageName || null,
          stageType: stType,
          status,
          cancellationReason: l.cancellationReason || null,
          amount: Number(l.amount) || 0,
          franchiseeName: l.franchiseeName || null,
        })
      }
    }

    // B2B — Deal
    if (type === "all" || type === "b2b") {
      const deals = await sql`
        SELECT
          d.id,
          COALESCE(d."contactName", d."clientName") AS "clientName",
          COALESCE(d."contactPhone", d."clientPhone") AS "clientPhone",
          COALESCE(d."leadSource", d.source) AS source,
          d."createdAt" AS "createdAt",
          COALESCE(d.budget, 0) AS amount,
          d."cancellationReason" AS "cancellationReason",
          s.name AS "stageName",
          s."stageType" AS "stageType",
          f.name AS "franchiseeName"
        FROM "Deal" d
        LEFT JOIN "PipelineStage" s ON d."stageId" = s.id
        LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
        WHERE (${srcFilter}::text IS NULL OR COALESCE(d."leadSource", d.source) = ${srcFilter})
          AND (${df}::timestamptz IS NULL OR d."createdAt" >= ${df})
          AND (${dt}::timestamptz IS NULL OR d."createdAt" <= ${dt})
          AND (${franchiseeFilter}::text IS NULL OR d."franchiseeId" = ${franchiseeFilter})
        ORDER BY d."createdAt" DESC
        LIMIT 5000
      `
      for (const d of deals as any[]) {
        const stType = d.stageType as string | null
        const status: Row["status"] = stType === "completed" ? "confirmed" : stType === "cancelled" ? "cancelled" : "in_progress"
        rows.push({
          id: d.id,
          kind: "b2b",
          clientName: d.clientName || "",
          clientPhone: d.clientPhone || null,
          source: d.source || null,
          createdAt: d.createdAt,
          currentStage: d.stageName || null,
          stageType: stType,
          status,
          cancellationReason: d.cancellationReason || null,
          amount: Number(d.amount) || 0,
          franchiseeName: d.franchiseeName || null,
        })
      }
    }

    // Summary by source
    const summary: Record<string, { total: number; confirmed: number; inProgress: number; cancelled: number; revenue: number }> = {}
    for (const r of rows) {
      const key = r.source || "(не указан)"
      if (!summary[key]) summary[key] = { total: 0, confirmed: 0, inProgress: 0, cancelled: 0, revenue: 0 }
      summary[key].total++
      if (r.status === "confirmed") {
        summary[key].confirmed++
        summary[key].revenue += r.amount
      } else if (r.status === "cancelled") summary[key].cancelled++
      else summary[key].inProgress++
    }

    // Distinct sources for filter dropdown
    const sources = Array.from(new Set(rows.map((r) => r.source).filter(Boolean))) as string[]

    return NextResponse.json({
      success: true,
      data: {
        leads: rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        summary,
        sources: sources.sort(),
      },
    })
  } catch (error) {
    console.error("[v0] marketing/leads-report error:", error)
    await logApiError(error, req).catch(() => {})
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 })
  }
}
