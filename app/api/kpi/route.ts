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
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const sql = neon(process.env.DATABASE_URL!)

    let kpis
    if (franchiseeId) {
      if (startDate && endDate) {
        kpis = await sql`
          SELECT k.*, f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Kpi" k
          LEFT JOIN "Franchisee" f ON k."franchiseeId" = f.id
          WHERE k."franchiseeId" = ${franchiseeId}
            AND k."startDate" >= ${startDate}
            AND k."endDate" <= ${endDate}
          ORDER BY k."startDate" DESC
        `
      } else {
        kpis = await sql`
          SELECT k.*, f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Kpi" k
          LEFT JOIN "Franchisee" f ON k."franchiseeId" = f.id
          WHERE k."franchiseeId" = ${franchiseeId}
          ORDER BY k."startDate" DESC
        `
      }
    } else {
      if (startDate && endDate) {
        kpis = await sql`
          SELECT k.*, f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Kpi" k
          LEFT JOIN "Franchisee" f ON k."franchiseeId" = f.id
          WHERE k."startDate" >= ${startDate}
            AND k."endDate" <= ${endDate}
          ORDER BY k."startDate" DESC
        `
      } else {
        kpis = await sql`
          SELECT k.*, f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Kpi" k
          LEFT JOIN "Franchisee" f ON k."franchiseeId" = f.id
          ORDER BY k."startDate" DESC
        `
      }
    }

    return NextResponse.json({ success: true, data: kpis })
  } catch (error) {
    console.error("[v0] KPI_GET error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "uk" && user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden - Only UK can set KPIs" }, { status: 403 })
    }

    const body = await request.json()
    const { franchiseeId, name, target, period, startDate, endDate } = body

    if (!franchiseeId || !name || !target || !period || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

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

    const body = await request.json()
    const { id, actual } = body

    if (!id) {
      return NextResponse.json({ error: "KPI ID required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    if (actual !== undefined) {
      await sql`UPDATE "Kpi" SET actual = ${actual}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    }

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

    if (user.role !== "uk" && user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "KPI ID required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    await sql`DELETE FROM "Kpi" WHERE id = ${id}::uuid`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] KPI_DELETE error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
