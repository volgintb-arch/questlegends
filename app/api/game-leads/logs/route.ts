import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const franchiseeId = searchParams.get("franchiseeId")

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
    console.error("[v0] Error fetching game logs:", error?.message)
    return NextResponse.json(
      { success: false, error: "Failed to fetch game logs", data: [] },
      { status: 500 },
    )
  }
}
