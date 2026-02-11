import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "super_admin" && user.role !== "uk" && user.role !== "uk_employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    const logs = await sql`
      SELECT 
        id,
        "dealId",
        action,
        "fromStageId",
        "toStageId",
        "fromStageName",
        "toStageName",
        "pipelineId",
        "pipelineName",
        "userId",
        "userName",
        details,
        "createdAt"
      FROM "DealLog"
      ORDER BY "createdAt" DESC
      LIMIT 500
    `

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[v0] Error fetching CRM logs:", error)
    return NextResponse.json({ error: "Internal error", logs: [] }, { status: 500 })
  }
}
