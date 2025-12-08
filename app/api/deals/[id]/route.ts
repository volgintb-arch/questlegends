import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

const sql = neon(process.env.DATABASE_URL!)

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    console.log("[v0] Fetching deal by id:", id)

    const deals = await sql`
      SELECT 
        d.*,
        f.name as "franchiseeName",
        f.city as "franchiseeCity"
      FROM "Deal" d
      LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
      WHERE d.id = ${id}
    `

    if (deals.length === 0) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }

    const deal = deals[0]
    console.log("[v0] Found deal:", deal.clientName)

    return NextResponse.json({
      success: true,
      ...deal,
      franchisee: {
        id: deal.franchiseeId,
        name: deal.franchiseeName,
        city: deal.franchiseeCity,
      },
    })
  } catch (error) {
    console.error("[v0] DEAL_GET error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    console.log("[v0] Updating deal:", id, body)

    const updates: string[] = []
    const values: any[] = []

    if (body.stage !== undefined) {
      updates.push(`"stage" = $${values.length + 1}`)
      values.push(body.stage)
    }
    if (body.clientName !== undefined) {
      updates.push(`"clientName" = $${values.length + 1}`)
      values.push(body.clientName)
    }
    if (body.clientPhone !== undefined) {
      updates.push(`"clientPhone" = $${values.length + 1}`)
      values.push(body.clientPhone)
    }
    if (body.clientEmail !== undefined) {
      updates.push(`"clientEmail" = $${values.length + 1}`)
      values.push(body.clientEmail)
    }
    if (body.price !== undefined) {
      updates.push(`"price" = $${values.length + 1}`)
      values.push(body.price)
    }
    if (body.participants !== undefined) {
      updates.push(`"participants" = $${values.length + 1}`)
      values.push(body.participants)
    }
    if (body.notes !== undefined) {
      updates.push(`"notes" = $${values.length + 1}`)
      values.push(body.notes)
    }
    if (body.responsibleManager !== undefined) {
      updates.push(`"responsibleManager" = $${values.length + 1}`)
      values.push(body.responsibleManager)
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 })
    }

    // Add updatedAt
    updates.push(`"updatedAt" = NOW()`)

    // Use sql.query for dynamic query
    const query = `UPDATE "Deal" SET ${updates.join(", ")} WHERE id = $${values.length + 1} RETURNING *`
    values.push(id)

    const result = await sql.query(query, values)

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }

    console.log("[v0] Deal updated successfully")
    return NextResponse.json({ success: true, data: result[0] })
  } catch (error) {
    console.error("[v0] DEAL_PATCH error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Only UK can delete deals
    if (user.role !== "uk") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    console.log("[v0] Deleting deal:", id)

    await sql`DELETE FROM "Deal" WHERE id = ${id}`

    console.log("[v0] Deal deleted successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] DEAL_DELETE error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
