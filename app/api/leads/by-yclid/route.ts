/**
 * GET /api/leads/by-yclid?yclids=a,b,c
 *
 * Server-to-server endpoint для внешних воркеров (Yandex Direct ROI bot и т.п.).
 * Auth: Authorization: Bearer ${INTEGRATION_API_KEY} (env)
 *
 * Ищет в обеих таблицах: Deal (B2B) и GameLead (B2C). Один yclid может быть
 * привязан и там, и там — вернём оба элемента, leadType различает.
 *
 * Limits: до 500 yclid за запрос.
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { logApiError } from "@/lib/app-logger"

const MAX_YCLIDS = 500

type Status = "new" | "scheduled" | "completed" | "cancelled"

function statusFromStageType(st: string | null): Status {
  if (st === "completed" || st === "won") return "completed"
  if (st === "cancelled" || st === "lost") return "cancelled"
  if (st === "scheduled") return "scheduled"
  return "new"
}

export async function GET(req: NextRequest) {
  try {
    // Bearer auth via INTEGRATION_API_KEY
    const expected = process.env.INTEGRATION_API_KEY
    if (!expected) {
      return NextResponse.json(
        { error: "INTEGRATION_API_KEY is not configured on server" },
        { status: 503 },
      )
    }
    const auth = req.headers.get("authorization") || ""
    const provided = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
    if (!provided || provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const yclidsParam = req.nextUrl.searchParams.get("yclids")
    if (!yclidsParam) {
      return NextResponse.json({ error: "yclids query param is required" }, { status: 400 })
    }
    const yclids = yclidsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    if (yclids.length === 0) {
      return NextResponse.json({ leads: [], notFound: [] })
    }
    if (yclids.length > MAX_YCLIDS) {
      return NextResponse.json(
        { error: `Too many yclids — max ${MAX_YCLIDS} per request` },
        { status: 400 },
      )
    }

    // Both queries hit the yclid index; ANY($1::text[]) — single round-trip per table
    const [dealRows, leadRows] = await Promise.all([
      sql`
        SELECT
          d.id, d.yclid, d."contactName", d."clientName",
          d.budget AS amount,
          d.city,
          d.source, d."leadSource",
          d."createdAt",
          d."scheduledAt", d."completedAt", d."cancelledAt",
          d."cancellationReason",
          s.name AS "stageName", s."stageType" AS "stageType"
        FROM "Deal" d
        LEFT JOIN "PipelineStage" s ON d."stageId" = s.id
        WHERE d.yclid = ANY(${yclids}::text[])
      `,
      sql`
        SELECT
          gl.id, gl.yclid, gl."clientName",
          gl."totalAmount" AS amount,
          gl.source,
          gl."createdAt",
          gl."scheduledAt", gl."completedAt", gl."cancelledAt",
          gl."cancellationReason",
          s.name AS "stageName", s."stageType" AS "stageType",
          f.name AS "franchiseeName", f.city AS "franchiseeCity"
        FROM "GameLead" gl
        LEFT JOIN "GamePipelineStage" s ON gl."stageId" = s.id
        LEFT JOIN "Franchisee" f ON gl."franchiseeId" = f.id
        WHERE gl.yclid = ANY(${yclids}::text[])
      `,
    ])

    const found = new Set<string>()
    const out: any[] = []

    for (const d of dealRows as any[]) {
      const stType = d.stageType as string | null
      found.add(d.yclid)
      out.push({
        yclid: d.yclid,
        leadId: d.id,
        leadType: "deal",
        status: statusFromStageType(stType),
        stageType: stType,
        stageName: d.stageName,
        clientName: d.contactName || d.clientName || null,
        city: d.city || null,
        createdAt: d.createdAt,
        scheduledAt: d.scheduledAt,
        completedAt: d.completedAt,
        cancelledAt: d.cancelledAt,
        cancellationReason: d.cancellationReason || null,
        revenue: d.amount ? Number(d.amount) : null,
        currency: "RUB",
        source: d.leadSource || d.source || null,
      })
    }
    for (const l of leadRows as any[]) {
      const stType = l.stageType as string | null
      found.add(l.yclid)
      out.push({
        yclid: l.yclid,
        leadId: l.id,
        leadType: "game_lead",
        status: statusFromStageType(stType),
        stageType: stType,
        stageName: l.stageName,
        clientName: l.clientName || null,
        city: l.franchiseeCity || null,
        franchiseeName: l.franchiseeName || null,
        createdAt: l.createdAt,
        scheduledAt: l.scheduledAt,
        completedAt: l.completedAt,
        cancelledAt: l.cancelledAt,
        cancellationReason: l.cancellationReason || null,
        revenue: l.amount ? Number(l.amount) : null,
        currency: "RUB",
        source: l.source || null,
      })
    }

    const notFound = yclids.filter((y) => !found.has(y))

    return NextResponse.json({ leads: out, notFound })
  } catch (error) {
    console.error("[v0] /api/leads/by-yclid error:", error)
    await logApiError(error, req).catch(() => {})
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
