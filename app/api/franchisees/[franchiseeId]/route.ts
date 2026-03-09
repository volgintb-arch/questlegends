import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"
import { cache } from "@/lib/cache"

// Префикс ключей кеша франчайзи (совпадает с route.ts)
const CACHE_PREFIX = "franchisees:"

export async function GET(request: NextRequest, { params }: { params: Promise<{ franchiseeId: string }> }) {
  try {
    const user = await verifyRequest(request)
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
    if (user.role !== "uk" && user.role !== "super_admin" && user.role !== "uk_employee" && user.franchiseeId !== franchiseeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: franchisee })
  } catch (error) {
    console.error("[v0] FRANCHISEE_GET error:")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ franchiseeId: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only UK, super_admin and uk_employee can update franchisees
    if (user.role !== "uk" && user.role !== "super_admin" && user.role !== "uk_employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { franchiseeId } = await params
    const body = await request.json()
    const sql = neon(process.env.DATABASE_URL!)

    // Fetch current franchisee
    const existing = await sql`SELECT * FROM "Franchisee" WHERE id = ${franchiseeId}`
    if (existing.length === 0) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 })
    }

    const current = existing[0]
    const name = body.name !== undefined ? body.name : current.name
    const city = body.city !== undefined ? body.city : current.city
    const address = body.address !== undefined ? body.address : (current.address || null)
    const phone = body.phone !== undefined ? body.phone : (current.phone || null)
    const email = body.email !== undefined ? body.email : (current.email || null)
    const royaltyPercent = body.royaltyPercent !== undefined ? Math.round(Number(body.royaltyPercent)) : current.royaltyPercent
    const royaltyPaymentDay = body.royaltyPaymentDay !== undefined ? (body.royaltyPaymentDay !== null ? Number(body.royaltyPaymentDay) : null) : (current.royaltyPaymentDay || null)

    const result = await sql`
      UPDATE "Franchisee"
      SET name = ${name}, city = ${city}, address = ${address},
          phone = ${phone}, email = ${email},
          "royaltyPercent" = ${royaltyPercent},
          "royaltyPaymentDay" = ${royaltyPaymentDay},
          "updatedAt" = NOW()
      WHERE id = ${franchiseeId}
      RETURNING *
    `

    // Invalidate franchisees cache so GET returns fresh data
    await cache.invalidatePattern(CACHE_PREFIX)

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error: any) {
    console.error("[v0] FRANCHISEE_PATCH error:", error?.message || error, error?.stack)
    return NextResponse.json({ error: "Internal server error", detail: error?.message || String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ franchiseeId: string }> }) {
  try {
    const user = await verifyRequest(request)
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

    await cache.invalidatePattern(CACHE_PREFIX)

    return NextResponse.json({ success: true, message: "Franchisee deleted" })
  } catch (error) {
    console.error("[v0] FRANCHISEE_DELETE error:")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
