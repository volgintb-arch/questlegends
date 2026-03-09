import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ukRoles = ["uk", "super_admin", "uk_employee"]

    const [transaction] = await sql`
      SELECT t.*, f.name as "franchiseeName"
      FROM "Transaction" t
      LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
      WHERE t.id = ${id}
    `

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    if (!ukRoles.includes(user.role) && transaction.franchiseeId !== user.franchiseeId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ success: true, transaction })
  } catch (error) {
    console.error("[v0] Error fetching transaction:")
    return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body = await req.json()

    const ukRoles = ["uk", "super_admin", "uk_employee"]

    const [existing] = await sql`SELECT * FROM "Transaction" WHERE id = ${id}`
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Check permissions - non-UK users can only edit their franchisee's transactions
    if (!ukRoles.includes(user.role) && existing.franchiseeId !== user.franchiseeId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { amount, paymentMethod, notes, paymentDate, royaltyAmount } = body

    await sql`
      UPDATE "Transaction"
      SET
        amount = ${amount !== undefined ? amount : existing.amount},
        "paymentMethod" = ${paymentMethod || existing.paymentMethod},
        notes = ${notes !== undefined ? notes : existing.notes},
        "paymentDate" = ${paymentDate || existing.paymentDate},
        "royaltyAmount" = ${royaltyAmount !== undefined ? royaltyAmount : existing.royaltyAmount}
      WHERE id = ${id}
    `

    const [updated] = await sql`SELECT * FROM "Transaction" WHERE id = ${id}`

    return NextResponse.json({ success: true, transaction: updated })
  } catch (error) {
    console.error("[v0] Error updating transaction:")
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ukRoles = ["uk", "super_admin", "uk_employee"]

    const [existing] = await sql`SELECT * FROM "Transaction" WHERE id = ${id}`
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Check permissions - non-UK users can only delete their franchisee's transactions
    if (!ukRoles.includes(user.role) && existing.franchiseeId !== user.franchiseeId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    await sql`DELETE FROM "Transaction" WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting transaction:")
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 })
  }
}
