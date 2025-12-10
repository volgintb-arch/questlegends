import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; staffId: string }> }) {
  try {
    const { staffId } = await params

    await sql`DELETE FROM "GameStaff" WHERE id = ${staffId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] GameStaff DELETE error:", error)
    return NextResponse.json({ success: false, error: "Failed to remove staff" }, { status: 500 })
  }
}
