import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(req: NextRequest, { params }: { params: { id: string; staffId: string } }) {
  try {
    const { staffId } = params

    await sql`DELETE FROM "GameScheduleStaff" WHERE id = ${staffId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error removing staff:", error)
    return NextResponse.json({ error: "Failed to remove staff" }, { status: 500 })
  }
}
