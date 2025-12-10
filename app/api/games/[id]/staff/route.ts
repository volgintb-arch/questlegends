import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: gameId } = await params
    const { personnelId, role, rate } = await request.json()

    const result = await sql`
      INSERT INTO "GameStaff" ("gameId", "personnelId", role, rate)
      VALUES (${gameId}, ${personnelId}, ${role}, ${rate})
      RETURNING *
    `

    return NextResponse.json({ success: true, assignment: result[0] })
  } catch (error) {
    console.error("[v0] GameStaff POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to assign staff" }, { status: 500 })
  }
}
