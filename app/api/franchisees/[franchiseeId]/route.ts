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

export async function GET(request: NextRequest, { params }: { params: Promise<{ franchiseeId: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { franchiseeId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    const franchisees = await sql`
      SELECT 
        f.*,
        (SELECT COUNT(*) FROM "Deal" WHERE "franchiseeId" = f.id) as "dealsCount",
        (SELECT COUNT(*) FROM "Transaction" WHERE "franchiseeId" = f.id) as "transactionsCount",
        (SELECT COUNT(*) FROM "Expense" WHERE "franchiseeId" = f.id) as "expensesCount",
        (SELECT COUNT(*) FROM "Personnel" WHERE "franchiseeId" = f.id) as "personnelCount",
        (SELECT COUNT(*) FROM "User" WHERE "franchiseeId" = f.id) as "usersCount"
      FROM "Franchisee" f
      WHERE f.id = ${franchiseeId}
    `

    if (franchisees.length === 0) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 })
    }

    const franchisee = franchisees[0]

    // Check access rights
    if (user.role !== "uk" && user.role !== "super_admin" && user.franchiseeId !== franchiseeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: franchisee })
  } catch (error) {
    console.error("[v0] FRANCHISEE_GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ franchiseeId: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only UK and super_admin can update franchisees
    if (user.role !== "uk" && user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { franchiseeId } = await params
    const body = await request.json()
    const sql = neon(process.env.DATABASE_URL!)

    // Update only provided fields
    if (body.name !== undefined) {
      await sql`UPDATE "Franchisee" SET name = ${body.name}, "updatedAt" = NOW() WHERE id = ${franchiseeId}`
    }
    if (body.city !== undefined) {
      await sql`UPDATE "Franchisee" SET city = ${body.city}, "updatedAt" = NOW() WHERE id = ${franchiseeId}`
    }
    if (body.address !== undefined) {
      await sql`UPDATE "Franchisee" SET address = ${body.address}, "updatedAt" = NOW() WHERE id = ${franchiseeId}`
    }
    if (body.phone !== undefined) {
      await sql`UPDATE "Franchisee" SET phone = ${body.phone}, "updatedAt" = NOW() WHERE id = ${franchiseeId}`
    }
    if (body.telegram !== undefined) {
      await sql`UPDATE "Franchisee" SET telegram = ${body.telegram}, "updatedAt" = NOW() WHERE id = ${franchiseeId}`
    }
    if (body.royaltyPercent !== undefined) {
      await sql`UPDATE "Franchisee" SET "royaltyPercent" = ${body.royaltyPercent}, "updatedAt" = NOW() WHERE id = ${franchiseeId}`
    }

    const result = await sql`SELECT * FROM "Franchisee" WHERE id = ${franchiseeId}`

    if (result.length === 0) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error) {
    console.error("[v0] FRANCHISEE_PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ franchiseeId: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only super_admin can delete franchisees
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { franchiseeId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    await sql`DELETE FROM "Franchisee" WHERE id = ${franchiseeId}`

    return NextResponse.json({ success: true, message: "Franchisee deleted" })
  } catch (error) {
    console.error("[v0] FRANCHISEE_DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
