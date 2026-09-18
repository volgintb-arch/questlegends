import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"
import { canAccessFranchisee } from "@/lib/tenant"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; staffId: string }> }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, staffId } = await params

    // Removal is scoped like assignment: the row must belong to this lead's
    // schedule and the caller must have access to that franchisee.
    const [assignment] = await sql`
      SELECT a.*, p.name as "personnelName", gs."franchiseeId", gs."leadId"
      FROM "GameScheduleStaff" a
      JOIN "GameSchedule" gs ON gs.id = a."scheduleId"
      LEFT JOIN "Personnel" p ON a."personnelId" = p.id
      WHERE a.id = ${staffId}
    `
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }
    if (assignment.leadId !== id || !canAccessFranchisee(user, assignment.franchiseeId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

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
    console.error("[v0] Error removing staff:")
    return NextResponse.json({ error: "Failed to remove staff" }, { status: 500 })
  }
}
