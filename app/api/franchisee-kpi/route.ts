import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk", "uk_employee"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    let kpis
    if (franchiseeId) {
      kpis = await sql`
        SELECT k.*, f.name as "franchiseeName"
        FROM "FranchiseeKPI" k
        JOIN "Franchisee" f ON f.id = k."franchiseeId"
        WHERE k."franchiseeId" = ${franchiseeId}
        ORDER BY k."periodYear" DESC, k."periodNumber" DESC
      `
    } else if (user.role === "uk_employee") {
      kpis = await sql`
        SELECT k.*, f.name as "franchiseeName"
        FROM "FranchiseeKPI" k
        JOIN "Franchisee" f ON f.id = k."franchiseeId"
        JOIN "UserFranchiseeAssignment" ufa ON ufa."franchiseeId" = k."franchiseeId"
        WHERE ufa."userId" = ${user.userId}
        ORDER BY k."periodYear" DESC, k."periodNumber" DESC
      `
    } else {
      kpis = await sql`
        SELECT k.*, f.name as "franchiseeName"
        FROM "FranchiseeKPI" k
        JOIN "Franchisee" f ON f.id = k."franchiseeId"
        ORDER BY k."periodYear" DESC, k."periodNumber" DESC
      `
    }

    return NextResponse.json(kpis)
  } catch (error: any) {
    console.error("[franchisee-kpi] GET error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()

    const { franchiseeId, periodType, periodNumber, periodYear, targetRevenue, targetGames, maxExpenses } = body

    if (!franchiseeId || !periodType || !periodNumber || !periodYear) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const id = globalThis.crypto.randomUUID()
    const result = await sql`
      INSERT INTO "FranchiseeKPI" (
        id, "franchiseeId", "periodType", "periodNumber", "periodYear",
        "targetRevenue", "targetGames", "maxExpenses",
        "actualRevenue", "actualGames", "actualExpenses",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${franchiseeId}, ${periodType}, ${periodNumber}, ${periodYear},
        ${targetRevenue || null}, ${targetGames || null}, ${maxExpenses || null},
        0, 0, 0, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error: any) {
    console.error("[franchisee-kpi] POST error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
