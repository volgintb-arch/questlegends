import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"
import { resolveFranchiseeFilter } from "@/lib/tenant"

export async function GET(req: NextRequest) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(req.url)

    // UK roles may filter by any franchisee (or see all).
    // Everyone else is pinned to their own franchisee; the query param is ignored.
    const franchiseeId = resolveFranchiseeFilter(user, searchParams.get("franchiseeId"))
    if (franchiseeId === undefined) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let logs
    if (franchiseeId) {
      logs = await sql`
        SELECT
          l.id,
          l."leadId",
          l.action,
          l."fromStageId",
          l."fromStageName",
          l."toStageId",
          l."toStageName",
          l."pipelineId",
          p.name as "pipelineName",
          l."userId",
          l."userName",
          l.details,
          l."createdAt",
          COALESCE(g."clientName", l."clientName") as "clientName"
        FROM "GameLeadLog" l
        LEFT JOIN "GameLead" g ON l."leadId" = g.id
        LEFT JOIN "GamePipeline" p ON l."pipelineId" = p.id
        WHERE g."franchiseeId" = ${franchiseeId}
           OR l."franchiseeId" = ${franchiseeId}
        ORDER BY l."createdAt" DESC
        LIMIT 100
      `
    } else {
      logs = await sql`
        SELECT
          l.id,
          l."leadId",
          l.action,
          l."fromStageId",
          l."fromStageName",
          l."toStageId",
          l."toStageName",
          l."pipelineId",
          p.name as "pipelineName",
          l."userId",
          l."userName",
          l.details,
          l."createdAt",
          COALESCE(g."clientName", l."clientName") as "clientName"
        FROM "GameLeadLog" l
        LEFT JOIN "GameLead" g ON l."leadId" = g.id
        LEFT JOIN "GamePipeline" p ON l."pipelineId" = p.id
        ORDER BY l."createdAt" DESC
        LIMIT 100
      `
    }

    return NextResponse.json({ success: true, data: logs })
  } catch (error: any) {
    console.error("[game-leads/logs] Error fetching logs:", error?.message)
    return NextResponse.json(
      { success: false, error: "Failed to fetch game logs", data: [] },
      { status: 500 },
    )
  }
}
