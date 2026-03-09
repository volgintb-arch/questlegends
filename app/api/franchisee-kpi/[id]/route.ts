import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()

    const existing = await sql`SELECT * FROM "FranchiseeKPI" WHERE id = ${id}`
    if (existing.length === 0) {
      return NextResponse.json({ error: "KPI not found" }, { status: 404 })
    }

    const current = existing[0]
    const targetRevenue = body.targetRevenue !== undefined ? body.targetRevenue : current.targetRevenue
    const targetGames = body.targetGames !== undefined ? body.targetGames : current.targetGames
    const maxExpenses = body.maxExpenses !== undefined ? body.maxExpenses : current.maxExpenses
    const actualRevenue = body.actualRevenue !== undefined ? body.actualRevenue : current.actualRevenue
    const actualGames = body.actualGames !== undefined ? body.actualGames : current.actualGames
    const actualExpenses = body.actualExpenses !== undefined ? body.actualExpenses : current.actualExpenses

    const result = await sql`
      UPDATE "FranchiseeKPI"
      SET "targetRevenue" = ${targetRevenue}, "targetGames" = ${targetGames},
          "maxExpenses" = ${maxExpenses}, "actualRevenue" = ${actualRevenue},
          "actualGames" = ${actualGames}, "actualExpenses" = ${actualExpenses},
          "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error: any) {
    console.error("[franchisee-kpi] PATCH error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const sql = neon(process.env.DATABASE_URL!)

    await sql`DELETE FROM "FranchiseeKPI" WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[franchisee-kpi] DELETE error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
