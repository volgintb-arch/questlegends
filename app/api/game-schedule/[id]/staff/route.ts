import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { v4 as uuidv4 } from "uuid"
import { verifyRequest } from "@/lib/simple-auth"
import { checkStaffTests } from "@/lib/check-staff-tests"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { personnelId, role, rate } = body

    // Check if staff has passed required tests
    const testError = await checkStaffTests(personnelId, role)
    if (testError) {
      return NextResponse.json({ error: testError }, { status: 400 })
    }

    const existing = await sql`
      SELECT id FROM "GameScheduleStaff" 
      WHERE "scheduleId" = ${id} AND "personnelId" = ${personnelId}
    `

    // If already exists, return existing assignment instead of creating duplicate
    if (existing.length > 0) {
      const [person] = await sql`SELECT name FROM "Personnel" WHERE id = ${personnelId}`

      return NextResponse.json({
        success: true,
        data: {
          id: existing[0].id,
          personnelId,
          personnelName: person?.name,
          role,
          rate,
        },
      })
    }

    // Otherwise create new assignment
    const staffId = uuidv4()

    await sql`
      INSERT INTO "GameScheduleStaff" (id, "scheduleId", "personnelId", role, rate)
      VALUES (${staffId}, ${id}, ${personnelId}, ${role}, ${rate || 0})
    `

    const [person] = await sql`SELECT name FROM "Personnel" WHERE id = ${personnelId}`

    return NextResponse.json({
      success: true,
      data: {
        id: staffId,
        personnelId,
        personnelName: person?.name,
        role,
        rate,
      },
    })
  } catch (error) {
    console.error("[v0] Error assigning staff:")
    return NextResponse.json({ error: "Failed to assign staff" }, { status: 500 })
  }
}
