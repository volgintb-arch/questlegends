import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"
import { checkStaffTests } from "@/lib/check-staff-tests"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: gameId } = await params
    const { personnelId, role, rate } = await request.json()

    // Check if staff has passed required tests
    const testError = await checkStaffTests(personnelId, role)
    if (testError) {
      return NextResponse.json({ success: false, error: testError }, { status: 400 })
    }

    const gameStaffId = globalThis.crypto.randomUUID()
    const result = await sql`
      INSERT INTO "GameStaff" (id, "gameId", "personnelId", role, rate)
      VALUES (${gameStaffId}, ${gameId}, ${personnelId}, ${role}, ${rate})
      RETURNING *
    `

    return NextResponse.json({ success: true, assignment: result[0] })
  } catch (error) {
    console.error("[v0] GameStaff POST error:")
    return NextResponse.json({ success: false, error: "Failed to assign staff" }, { status: 500 })
  }
}
