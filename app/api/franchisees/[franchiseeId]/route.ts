import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(request: NextRequest, { params }: { params: { franchiseeId: string } }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { franchiseeId } = params
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

export async function PATCH(request: NextRequest, { params }: { params: { franchiseeId: string } }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only UK and super_admin can update franchisees
    if (user.role !== "uk" && user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { franchiseeId } = params
    const body = await request.json()
    const sql = neon(process.env.DATABASE_URL!)

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(body.name)
    }
    if (body.city !== undefined) {
      updates.push(`city = $${paramIndex++}`)
      values.push(body.city)
    }
    if (body.address !== undefined) {
      updates.push(`address = $${paramIndex++}`)
      values.push(body.address)
    }
    if (body.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`)
      values.push(body.phone)
    }
    if (body.telegram !== undefined) {
      updates.push(`telegram = $${paramIndex++}`)
      values.push(body.telegram)
    }
    if (body.royaltyPercent !== undefined) {
      updates.push(`"royaltyPercent" = $${paramIndex++}`)
      values.push(Number(body.royaltyPercent))
    }

    if (updates.length > 0) {
      updates.push(`"updatedAt" = NOW()`)
      values.push(franchiseeId)

      const query = `UPDATE "Franchisee" SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`
      const result = await sql(query, values)

      if (result.length === 0) {
        return NextResponse.json({ error: "Franchisee not found" }, { status: 404 })
      }

      console.log("[v0] Franchisee updated successfully:", result[0])
      return NextResponse.json({ success: true, data: result[0] })
    }

    // If no updates, just return current data
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

export async function DELETE(request: NextRequest, { params }: { params: { franchiseeId: string } }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only super_admin can delete franchisees
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { franchiseeId } = params
    const sql = neon(process.env.DATABASE_URL!)

    await sql`DELETE FROM "Franchisee" WHERE id = ${franchiseeId}`

    return NextResponse.json({ success: true, message: "Franchisee deleted" })
  } catch (error) {
    console.error("[v0] FRANCHISEE_DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
