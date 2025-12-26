import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const [transaction] = await sql`
      SELECT t.*, f.name as "franchiseeName"
      FROM "Transaction" t
      LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
      WHERE t.id = ${id}
    `

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, transaction })
  } catch (error) {
    console.error("[v0] Error fetching transaction:", error)
    return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyRequest(req)
    const body = await req.json()

    const [existing] = await sql`SELECT * FROM "Transaction" WHERE id = ${id}`
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Check permissions - user can only edit their franchisee's transactions
    if (user?.role === "franchisee" && existing.franchiseeId !== user.franchiseeId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { type, amount, category, description, date } = body

    await sql`
      UPDATE "Transaction"
      SET 
        type = ${type || existing.type},
        amount = ${amount !== undefined ? amount : existing.amount},
        category = ${category || existing.category},
        description = ${description !== undefined ? description : existing.description},
        date = ${date || existing.date}
      WHERE id = ${id}
    `

    const [updated] = await sql`SELECT * FROM "Transaction" WHERE id = ${id}`

    return NextResponse.json({ success: true, transaction: updated })
  } catch (error) {
    console.error("[v0] Error updating transaction:", error)
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyRequest(req)

    const [existing] = await sql`SELECT * FROM "Transaction" WHERE id = ${id}`
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Check permissions - user can only delete their franchisee's transactions
    if (user?.role === "franchisee" && existing.franchiseeId !== user.franchiseeId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    await sql`DELETE FROM "Transaction" WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting transaction:", error)
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 })
  }
}
