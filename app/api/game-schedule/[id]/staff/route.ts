import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { v4 as uuidv4 } from "uuid"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await req.json()
    const { personnelId, role, rate } = body

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
    console.error("[v0] Error assigning staff:", error)
    return NextResponse.json({ error: "Failed to assign staff" }, { status: 500 })
  }
}
