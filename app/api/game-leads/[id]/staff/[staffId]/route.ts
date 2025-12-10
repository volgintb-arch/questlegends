import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; staffId: string }> }) {
  try {
    const { id, staffId } = await params

    const [assignment] = await sql`
      SELECT a.*, p.name as "personnelName"
      FROM "GameScheduleStaff" a
      JOIN "Personnel" p ON a."personnelId" = p.id
      WHERE a.id = ${staffId}
    `

    await sql`DELETE FROM "GameScheduleStaff" WHERE id = ${staffId}`

    // Log removal
    if (assignment) {
      await sql`
        INSERT INTO "GameLeadEvent" ("leadId", type, content)
        VALUES (${id}, 'system', ${"Снят с игры: " + assignment.personnelName})
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error removing staff:", error)
    return NextResponse.json({ error: "Failed to remove staff" }, { status: 500 })
  }
}
