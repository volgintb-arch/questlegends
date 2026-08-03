import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyRequest } from "@/lib/simple-auth"
import { logApiError } from "@/lib/app-logger"
import { normalizeSource } from "@/lib/lead-sources"

/**
 * Unified marketing report: B2B deals + B2C game leads grouped by source.
 * Returns status (new/in_progress/approved/completed/cancelled).
 *
 * Query params:
 *   source     — filter by source (Marquiz, Сайт, etc.) or "all"
 *   dateFrom   — filter created date >= (YYYY-MM-DD)
 *   dateTo     — filter created date <= (YYYY-MM-DD)
 *   type       — "b2b" | "b2c" | "all" (default "all")
 *   franchiseeId — UK only: filter by specific franchisee
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
    const franchiseeFilter = isUK
      ? (franchiseeParam && franchiseeParam !== "all" ? franchiseeParam : null)
      : user.franchiseeId || null

    const srcFilter = source === "all" ? null : source
    // Отсекаем невалидные даты — иначе `postgres` при подстановке ${df} упадёт
    // с RangeError: Invalid time value в момент .toISOString() на Invalid Date.
    const safeDate = (v: string | null): Date | null => {
      if (!v) return null
      const d = new Date(v)
      return Number.isNaN(d.getTime()) ? null : d
    }
    const df = safeDate(dateFrom)
    const dt = dateTo ? safeDate(dateTo + "T23:59:59.999Z") : null

    // Normalize stage to one of 5 statuses based on stageType and name
    function normalizeStatus(
      stType: string | null,
      stName: string | null,
    ): "new" | "in_progress" | "approved" | "completed" | "cancelled" {
      if (stType === "cancelled" || stType === "lost") return "cancelled"
      if (stType === "completed" || stType === "won") return "completed"
      if (stType === "scheduled") return "approved"
      if (stType === "new") return "new"
      if (stType === "in_progress") return "in_progress"
      // Fallback by name
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
      source: string | null
      createdAt: string
      currentStage: string | null
      stageType: string | null
      status: "new" | "in_progress" | "approved" | "completed" | "cancelled"
      cancellationReason: string | null
      amount: number
      franchiseeName: string | null
      pipelineId: string | null
    }

    const rows: Row[] = []

    // Check if cancellationReason column exists (may be missing if migration wasn't applied)
    const hasGameCancelCol = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'GameLead' AND column_name = 'cancellationReason'
      LIMIT 1
    `
    const hasDealCancelCol = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Deal' AND column_name = 'cancellationReason'
      LIMIT 1
    `

    // B2C — GameLead (source filter applied in JS via normalization)
    if (type === "all" || type === "b2c") {
      const cancelSelect = hasGameCancelCol.length > 0 ? `gl."cancellationReason"` : `NULL`
      const leads = await sql`
        SELECT
          gl.id,
          gl."clientName" AS "clientName",
          gl."clientPhone" AS "clientPhone",
          gl.source AS source,
          gl."createdAt" AS "createdAt",
          gl."totalAmount" AS amount,
          gl."pipelineId" AS "pipelineId",
          ${sql.unsafe(cancelSelect)} AS "cancellationReason",
          s.name AS "stageName",
          s."stageType" AS "stageType",
          f.name AS "franchiseeName"
        FROM "GameLead" gl
        LEFT JOIN "GamePipelineStage" s ON gl."stageId" = s.id
        LEFT JOIN "Franchisee" f ON gl."franchiseeId" = f.id
        WHERE (${df}::timestamptz IS NULL OR gl."createdAt" >= ${df})
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
          source: l.source || null,
          createdAt: l.createdAt,
          currentStage: l.stageName || null,
          stageType: l.stageType || null,
          status: normalizeStatus(l.stageType, l.stageName),
          cancellationReason: l.cancellationReason || null,
          amount: Number(l.amount) || 0,
          franchiseeName: l.franchiseeName || null,
          pipelineId: l.pipelineId || null,
        })
      }
    }

    // B2B — Deal (source filter applied in JS via normalization)
    if (type === "all" || type === "b2b") {
      const cancelSelect = hasDealCancelCol.length > 0 ? `d."cancellationReason"` : `NULL`
      const deals = await sql`
        SELECT
          d.id,
          COALESCE(d."contactName", d."clientName") AS "clientName",
          COALESCE(d."contactPhone", d."clientPhone") AS "clientPhone",
          COALESCE(d."leadSource", d.source) AS source,
          d."createdAt" AS "createdAt",
          COALESCE(d.budget, 0) AS amount,
          d."pipelineId" AS "pipelineId",
          ${sql.unsafe(cancelSelect)} AS "cancellationReason",
          s.name AS "stageName",
          s."stageType" AS "stageType",
          f.name AS "franchiseeName"
        FROM "Deal" d
        LEFT JOIN "PipelineStage" s ON d."stageId" = s.id
        LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
        WHERE (${df}::timestamptz IS NULL OR d."createdAt" >= ${df})
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
          source: d.source || null,
          createdAt: d.createdAt,
          currentStage: d.stageName || null,
          stageType: d.stageType || null,
          status: normalizeStatus(d.stageType, d.stageName),
          cancellationReason: d.cancellationReason || null,
          amount: Number(d.amount) || 0,
          franchiseeName: d.franchiseeName || null,
          pipelineId: d.pipelineId || null,
        })
      }
    }

    // Apply source filter on normalized values
    const filteredRows = srcFilter
      ? rows.filter((r) => normalizeSource(r.source) === srcFilter)
      : rows

    // Summary by NORMALIZED source — collapses dupes like "2 ГИС" / "2ГИС" / "2Гис"
    const summary: Record<
      string,
      {
        total: number
        new: number
        inProgress: number
        approved: number
        completed: number
        cancelled: number
        revenue: number
      }
    > = {}
    for (const r of filteredRows) {
      const key = normalizeSource(r.source)
      if (!summary[key]) summary[key] = { total: 0, new: 0, inProgress: 0, approved: 0, completed: 0, cancelled: 0, revenue: 0 }
      summary[key].total++
      if (r.status === "new") summary[key].new++
      else if (r.status === "in_progress") summary[key].inProgress++
      else if (r.status === "approved") summary[key].approved++
      else if (r.status === "completed") {
        summary[key].completed++
        summary[key].revenue += r.amount
      } else if (r.status === "cancelled") summary[key].cancelled++
    }

    // Distinct normalized sources from full data set (not constrained by current filter)
    const sourceSet = new Set<string>()
    for (const r of rows) sourceSet.add(normalizeSource(r.source))
    sourceSet.delete("(не указан)")
    const sources = Array.from(sourceSet).sort()

    return NextResponse.json({
      success: true,
      data: {
        leads: filteredRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        summary,
        sources,
      },
    })
  } catch (error) {
    console.error("[v0] marketing/leads-report error:", error)
    await logApiError(error, req).catch(() => {})
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 })
  }
}
