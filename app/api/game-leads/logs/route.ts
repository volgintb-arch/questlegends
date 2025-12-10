import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

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
          l."toStageId",
          l."fromStageName",
          l."toStageName",
          l."pipelineId",
          l."pipelineName",
          l."userId",
          l."userName",
          l.details,
          l."createdAt",
          g."clientName"
        FROM "GameLeadLog" l
        LEFT JOIN "GameLead" g ON l."leadId" = g.id
        WHERE g."franchiseeId" = ${franchiseeId} OR g."franchiseeId" IS NULL
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
          l."toStageId",
          l."fromStageName",
          l."toStageName",
          l."pipelineId",
          l."pipelineName",
          l."userId",
          l."userName",
          l.details,
          l."createdAt",
          g."clientName"
        FROM "GameLeadLog" l
        LEFT JOIN "GameLead" g ON l."leadId" = g.id
        ORDER BY l."createdAt" DESC
        LIMIT 100
      `
    }

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error("[v0] Error fetching game logs:", error)
    return NextResponse.json({ success: true, data: [] })
  }
}
