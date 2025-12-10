import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const franchiseeId = searchParams.get("franchiseeId")

    if (!franchiseeId) {
      return NextResponse.json({ error: "franchiseeId required" }, { status: 400 })
    }

    // Get completed stages for this franchisee's pipelines
    const completedStages = await sql`
      SELECT s.id FROM "GamePipelineStage" s
      JOIN "GamePipeline" p ON s."pipelineId" = p.id
      WHERE s."stageType" = 'completed' AND p."franchiseeId" = ${franchiseeId}
    `
    const completedIds = completedStages.map((s) => s.id)

    // Get cancelled stages
    const cancelledStages = await sql`
      SELECT s.id FROM "GamePipelineStage" s
      JOIN "GamePipeline" p ON s."pipelineId" = p.id
      WHERE s."stageType" = 'cancelled' AND p."franchiseeId" = ${franchiseeId}
    `
    const cancelledIds = cancelledStages.map((s) => s.id)

    // Get scheduled stages
    const scheduledStages = await sql`
      SELECT s.id FROM "GamePipelineStage" s
      JOIN "GamePipeline" p ON s."pipelineId" = p.id
      WHERE s."stageType" = 'scheduled' AND p."franchiseeId" = ${franchiseeId}
    `
    const scheduledIds = scheduledStages.map((s) => s.id)

    const completedStats = { totalRevenue: 0, count: 0, avgCheck: 0 }
    const cancelledStats = { lostRevenue: 0, count: 0 }
    const scheduledStats = { count: 0, totalAmount: 0 }

    if (completedIds.length > 0) {
      const [stats] = await sql`
        SELECT 
          COALESCE(SUM("totalAmount"), 0) as "totalRevenue",
          COUNT(*) as count
        FROM "GameLead"
        WHERE "stageId" = ANY(${completedIds})
        AND "franchiseeId" = ${franchiseeId}
      `
      completedStats.totalRevenue = Number(stats.totalRevenue)
      completedStats.count = Number(stats.count)
      completedStats.avgCheck = stats.count > 0 ? Math.round(completedStats.totalRevenue / Number(stats.count)) : 0
    }

    if (cancelledIds.length > 0) {
      const [stats] = await sql`
        SELECT 
          COALESCE(SUM("totalAmount"), 0) as "lostRevenue",
          COUNT(*) as count
        FROM "GameLead"
        WHERE "stageId" = ANY(${cancelledIds})
        AND "franchiseeId" = ${franchiseeId}
      `
      cancelledStats.lostRevenue = Number(stats.lostRevenue)
      cancelledStats.count = Number(stats.count)
    }

    if (scheduledIds.length > 0) {
      const [stats] = await sql`
        SELECT 
          COALESCE(SUM("totalAmount"), 0) as "totalAmount",
          COUNT(*) as count
        FROM "GameLead"
        WHERE "stageId" = ANY(${scheduledIds})
        AND "franchiseeId" = ${franchiseeId}
      `
      scheduledStats.count = Number(stats.count)
      scheduledStats.totalAmount = Number(stats.totalAmount)
    }

    return NextResponse.json({
      completed: completedStats,
      cancelled: cancelledStats,
      scheduled: scheduledStats,
    })
  } catch (error) {
    console.error("[v0] Error fetching game stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
