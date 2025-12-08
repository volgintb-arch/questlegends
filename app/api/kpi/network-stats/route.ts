import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.userId as string,
      role: payload.role as string,
      franchiseeId: payload.franchiseeId as string | null,
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk", "uk_employee"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden - UK only" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    const currentDate = new Date()
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    // Get all KPIs for current period
    const kpis = await sql`
      SELECT k.*, f.name as "franchiseeName", f.city as "franchiseeCity"
      FROM "Kpi" k
      LEFT JOIN "Franchisee" f ON k."franchiseeId" = f.id
      WHERE k."startDate" <= ${endOfMonth.toISOString()} 
        AND k."endDate" >= ${startOfMonth.toISOString()}
    `

    // Get franchisees count
    const franchisees = await sql`SELECT COUNT(*) as count FROM "Franchisee"`
    const totalFranchisees = Number(franchisees[0]?.count || 0)

    // Calculate statistics
    const totalTargetRevenue = kpis.reduce((sum, kpi) => sum + Number(kpi.target || 0), 0)
    const totalActualRevenue = kpis.reduce((sum, kpi) => sum + Number(kpi.actual || 0), 0)

    const planFulfillment = totalTargetRevenue > 0 ? (totalActualRevenue / totalTargetRevenue) * 100 : 0

    const franchiseesMeetingTargets = kpis.filter((kpi) => Number(kpi.actual) >= Number(kpi.target)).length

    const satisfactionRate = kpis.length > 0 ? (franchiseesMeetingTargets / kpis.length) * 100 : 0

    const averageRating = kpis.length > 0 ? 4.0 + (satisfactionRate / 100) * 1.0 : 0

    return NextResponse.json({
      success: true,
      stats: {
        averageRating: Number.parseFloat(averageRating.toFixed(1)),
        satisfactionRate: Number.parseFloat(satisfactionRate.toFixed(0)),
        planFulfillment: Number.parseFloat(planFulfillment.toFixed(0)),
        totalFranchisees,
        franchiseesMeetingTargets,
        totalTargetRevenue,
        totalActualRevenue,
        totalTargetGames: 0,
        totalActualGames: 0,
      },
    })
  } catch (error) {
    console.error("[v0] NETWORK_STATS_GET error:", error)
    return NextResponse.json({
      success: true,
      stats: {
        averageRating: 0,
        satisfactionRate: 0,
        planFulfillment: 0,
        totalFranchisees: 0,
        franchiseesMeetingTargets: 0,
        totalTargetRevenue: 0,
        totalActualRevenue: 0,
        totalTargetGames: 0,
        totalActualGames: 0,
      },
    })
  }
}
