import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/simple-auth"

async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.substring(7)
  const payload = verifyToken(token)
  return payload as { id: string; role: string; name: string } | null
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const pipelineId = searchParams.get("pipelineId")

    // Get completed deals stats (stageType = 'completed')
    const completedQuery = pipelineId
      ? sql`
          SELECT 
            COALESCE(SUM(CAST(d."investmentAmount" AS DECIMAL)), 0) as "totalInvestments",
            COALESCE(SUM(CAST(d."paushalnyyVznos" AS DECIMAL)), 0) as "totalPaushalka",
            COUNT(*) as "completedCount"
          FROM "Deal" d
          JOIN "PipelineStage" s ON d."stageId" = s.id
          WHERE s."stageType" = 'completed' AND d."pipelineId" = ${pipelineId}::uuid
        `
      : sql`
          SELECT 
            COALESCE(SUM(CAST(d."investmentAmount" AS DECIMAL)), 0) as "totalInvestments",
            COALESCE(SUM(CAST(d."paushalnyyVznos" AS DECIMAL)), 0) as "totalPaushalka",
            COUNT(*) as "completedCount"
          FROM "Deal" d
          JOIN "PipelineStage" s ON d."stageId" = s.id
          WHERE s."stageType" = 'completed'
        `

    // Get cancelled deals stats (stageType = 'cancelled')
    const cancelledQuery = pipelineId
      ? sql`
          SELECT 
            COALESCE(SUM(CAST(d."paushalnyyVznos" AS DECIMAL)), 0) as "lostPaushalka",
            COUNT(*) as "cancelledCount"
          FROM "Deal" d
          JOIN "PipelineStage" s ON d."stageId" = s.id
          WHERE s."stageType" = 'cancelled' AND d."pipelineId" = ${pipelineId}::uuid
        `
      : sql`
          SELECT 
            COALESCE(SUM(CAST(d."paushalnyyVznos" AS DECIMAL)), 0) as "lostPaushalka",
            COUNT(*) as "cancelledCount"
          FROM "Deal" d
          JOIN "PipelineStage" s ON d."stageId" = s.id
          WHERE s."stageType" = 'cancelled'
        `

    const [completedStats] = await completedQuery
    const [cancelledStats] = await cancelledQuery

    return NextResponse.json({
      completed: {
        totalInvestments: Number(completedStats?.totalInvestments || 0),
        totalPaushalka: Number(completedStats?.totalPaushalka || 0),
        count: Number(completedStats?.completedCount || 0),
      },
      cancelled: {
        lostPaushalka: Number(cancelledStats?.lostPaushalka || 0),
        count: Number(cancelledStats?.cancelledCount || 0),
      },
    })
  } catch (error) {
    console.error("Error fetching CRM stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
