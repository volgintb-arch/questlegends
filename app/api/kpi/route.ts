import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

async function getCurrentUser(request: NextRequest) {
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

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    console.log("[v0] KPI GET params:", { franchiseeId, userRole: user.role })

    if (!process.env.DATABASE_URL) {
      console.error("[v0] DATABASE_URL not set")
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    let kpis
    if (user.role === "uk_employee") {
      // uk_employee sees only KPIs for assigned franchisees
      if (franchiseeId && franchiseeId !== "all") {
        kpis = await sql`
          SELECT k.*, f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Kpi" k
          LEFT JOIN "Franchisee" f ON k."franchiseeId" = f.id
          INNER JOIN "UserFranchiseeAssignment" ufa ON k."franchiseeId" = ufa."franchiseeId"
          WHERE ufa."userId" = ${user.id} AND k."franchiseeId" = ${franchiseeId}
          ORDER BY k."createdAt" DESC
        `
      } else {
        kpis = await sql`
          SELECT k.*, f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Kpi" k
          LEFT JOIN "Franchisee" f ON k."franchiseeId" = f.id
          INNER JOIN "UserFranchiseeAssignment" ufa ON k."franchiseeId" = ufa."franchiseeId"
          WHERE ufa."userId" = ${user.id}
          ORDER BY k."createdAt" DESC
        `
      }
    } else if (franchiseeId && franchiseeId !== "all") {
      console.log("[v0] Fetching KPIs for specific franchisee:", franchiseeId)
      kpis = await sql`
        SELECT k.*, f.name as "franchiseeName", f.city as "franchiseeCity"
        FROM "Kpi" k
        LEFT JOIN "Franchisee" f ON k."franchiseeId" = f.id
        WHERE k."franchiseeId" = ${franchiseeId}
        ORDER BY k."createdAt" DESC
      `
    } else {
      console.log("[v0] Fetching all KPIs")
      kpis = await sql`
        SELECT k.*, f.name as "franchiseeName", f.city as "franchiseeCity"
        FROM "Kpi" k
        LEFT JOIN "Franchisee" f ON k."franchiseeId" = f.id
        ORDER BY k."createdAt" DESC
      `
    }

    console.log("[v0] KPI query result count:", kpis.length)

    const mappedKpis = kpis.map((kpi: any) => ({
      id: kpi.id,
      franchiseeId: kpi.franchiseeId,
      franchiseeName: kpi.franchiseeName || "Неизвестно",
      franchiseeCity: kpi.franchiseeCity || "",
      name: kpi.name,
      target: Number.parseFloat(kpi.target) || 0,
      actual: Number.parseFloat(kpi.actual) || 0,
      period: kpi.period,
      startDate: kpi.startDate,
      endDate: kpi.endDate,
      createdAt: kpi.createdAt,
      updatedAt: kpi.updatedAt,
    }))

    console.log("[v0] Returning KPIs:", mappedKpis.length)
    return NextResponse.json({ success: true, data: mappedKpis })
  } catch (error) {
    console.error("[v0] KPI_GET error:", error)
    return NextResponse.json(
      { error: "Internal error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "uk" && user.role !== "super_admin" && user.role !== "uk_employee") {
      return NextResponse.json({ error: "Forbidden - Only UK can set KPIs" }, { status: 403 })
    }

    const body = await request.json()
    const { franchiseeId, name, target, period, startDate, endDate } = body

    if (!franchiseeId || !name || !target || !period || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    if (user.role === "uk_employee") {
      const assignment = await sql`
        SELECT 1 FROM "UserFranchiseeAssignment" 
        WHERE "userId" = ${user.id} AND "franchiseeId" = ${franchiseeId}
      `
      if (assignment.length === 0) {
        return NextResponse.json({ error: "Forbidden - No access to this franchisee" }, { status: 403 })
      }
    }

    const result = await sql`
      INSERT INTO "Kpi" ("franchiseeId", name, target, actual, period, "startDate", "endDate", "createdById", "createdAt", "updatedAt")
      VALUES (${franchiseeId}, ${name}, ${target}, 0, ${period}, ${startDate}, ${endDate}, ${user.id}, NOW(), NOW())
      RETURNING *
    `

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error) {
    console.error("[v0] KPI_POST error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "uk" && user.role !== "super_admin" && user.role !== "uk_employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, target, actual, period, startDate, endDate } = body

    if (!id) {
      return NextResponse.json({ error: "KPI ID required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    if (user.role === "uk_employee") {
      const kpiCheck = await sql`
        SELECT k."franchiseeId" FROM "Kpi" k
        INNER JOIN "UserFranchiseeAssignment" ufa ON k."franchiseeId" = ufa."franchiseeId"
        WHERE k.id = ${id}::uuid AND ufa."userId" = ${user.id}
      `
      if (kpiCheck.length === 0) {
        return NextResponse.json({ error: "Forbidden - No access to this KPI" }, { status: 403 })
      }
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []

    if (name !== undefined) {
      updates.push(`name = $${values.length + 1}`)
      values.push(name)
    }
    if (target !== undefined) {
      updates.push(`target = $${values.length + 1}`)
      values.push(target)
    }
    if (actual !== undefined) {
      updates.push(`actual = $${values.length + 1}`)
      values.push(actual)
    }
    if (period !== undefined) {
      updates.push(`period = $${values.length + 1}`)
      values.push(period)
    }
    if (startDate !== undefined) {
      updates.push(`"startDate" = $${values.length + 1}`)
      values.push(startDate)
    }
    if (endDate !== undefined) {
      updates.push(`"endDate" = $${values.length + 1}`)
      values.push(endDate)
    }

    // Use simple update with all provided fields
    await sql`
      UPDATE "Kpi" 
      SET 
        name = COALESCE(${name || null}, name),
        target = COALESCE(${target !== undefined ? target : null}, target),
        actual = COALESCE(${actual !== undefined ? actual : null}, actual),
        period = COALESCE(${period || null}, period),
        "startDate" = COALESCE(${startDate || null}, "startDate"),
        "endDate" = COALESCE(${endDate || null}, "endDate"),
        "updatedAt" = NOW()
      WHERE id = ${id}::uuid
    `

    const result = await sql`SELECT * FROM "Kpi" WHERE id = ${id}::uuid`
    return NextResponse.json({ success: true, data: result[0] })
  } catch (error) {
    console.error("[v0] KPI_PATCH error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "uk" && user.role !== "super_admin" && user.role !== "uk_employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "KPI ID required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    if (user.role === "uk_employee") {
      const kpiCheck = await sql`
        SELECT k."franchiseeId" FROM "Kpi" k
        INNER JOIN "UserFranchiseeAssignment" ufa ON k."franchiseeId" = ufa."franchiseeId"
        WHERE k.id = ${id}::uuid AND ufa."userId" = ${user.id}
      `
      if (kpiCheck.length === 0) {
        return NextResponse.json({ error: "Forbidden - No access to this KPI" }, { status: 403 })
      }
    }

    await sql`DELETE FROM "Kpi" WHERE id = ${id}::uuid`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] KPI_DELETE error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
