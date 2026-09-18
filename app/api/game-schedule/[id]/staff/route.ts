import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { v4 as uuidv4 } from "uuid"
import { verifyRequest } from "@/lib/simple-auth"
import { canAccessFranchisee } from "@/lib/tenant"
import { AccessControl, type SystemRole } from "@/lib/access-control"
import { resolveAssignmentRate, findTimeConflict } from "@/lib/staffing"
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
    const { personnelId, role } = body

    const [schedule] = await sql`
      SELECT gs.id, gs."franchiseeId", gs."gameDate", gs."gameTime",
             TO_CHAR(gs."gameDate", 'YYYY-MM-DD') as "gameDay",
             gl."gameDuration", gl."animatorRate", gl."hostRate", gl."djRate"
      FROM "GameSchedule" gs
      LEFT JOIN "GameLead" gl ON gl.id = gs."leadId"
      WHERE gs.id = ${id}
    `
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }
    if (!canAccessFranchisee(user, schedule.franchiseeId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    if (!personnelId || !role) {
      return NextResponse.json({ error: "personnelId and role are required" }, { status: 400 })
    }

    // Rate snapshot: the lead's planned rate for the role; a client value only
    // when there is no plan and the caller may edit leads (it ends up in the books).
    const canSetRate = new AccessControl({
      id: user.userId,
      role: user.role as SystemRole,
      franchiseeId: user.franchiseeId,
    }).canPerformAction("leads", "edit")
    const rate = resolveAssignmentRate(body.rate, role, schedule, canSetRate)

    // The person must belong to the same franchisee as the game. Without this a
    // caller could attach (and, via the conflict message, learn about) another
    // franchisee's staff.
    const [personRow] = await sql`SELECT "franchiseeId", name FROM "Personnel" WHERE id = ${personnelId}`
    if (!personRow) {
      return NextResponse.json({ error: "Personnel not found" }, { status: 404 })
    }
    if (personRow.franchiseeId !== schedule.franchiseeId) {
      return NextResponse.json({ error: "Сотрудник относится к другой франшизе" }, { status: 403 })
    }

    // Check if staff has passed required tests
    const testError = await checkStaffTests(personnelId, role)
    if (testError) {
      return NextResponse.json({ error: testError }, { status: 400 })
    }

    // Double booking: same person on another game that overlaps in time the same day.
    const others = await sql`
      SELECT gs.id, gs."clientName", gs."gameTime", COALESCE(gl."gameDuration", 3) as duration
      FROM "GameScheduleStaff" gss
      JOIN "GameSchedule" gs ON gs.id = gss."scheduleId"
      LEFT JOIN "GameLead" gl ON gl.id = gs."leadId"
      WHERE gss."personnelId" = ${personnelId}
        AND gs."franchiseeId" = ${schedule.franchiseeId}
        AND gs.id <> ${id}
        AND DATE(gs."gameDate") = ${schedule.gameDay}::date
    `
    const conflict = findTimeConflict({ gameTime: schedule.gameTime, duration: schedule.gameDuration }, others)
    if (conflict) {
      return NextResponse.json(
        { error: `Сотрудник уже назначен на игру в это время: ${conflict.clientName || "без имени"} в ${conflict.gameTime}` },
        { status: 409 },
      )
    }

    const existing = await sql`
      SELECT id FROM "GameScheduleStaff" 
      WHERE "scheduleId" = ${id} AND "personnelId" = ${personnelId}
    `

    // If already exists, return existing assignment instead of creating duplicate
    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          id: existing[0].id,
          personnelId,
          personnelName: personRow.name,
          role,
          rate,
        },
      })
    }

    // Otherwise create new assignment
    const staffId = uuidv4()

    await sql`
      INSERT INTO "GameScheduleStaff" (id, "scheduleId", "personnelId", role, rate)
      VALUES (${staffId}, ${id}, ${personnelId}, ${role}, ${rate})
    `

    return NextResponse.json({
      success: true,
      data: {
        id: staffId,
        personnelId,
        personnelName: personRow.name,
        role,
        rate,
      },
    })
  } catch (error) {
    console.error("[v0] Error assigning staff:")
    return NextResponse.json({ error: "Failed to assign staff" }, { status: 500 })
  }
}
