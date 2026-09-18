import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"
import { canAccessFranchisee } from "@/lib/tenant"
import { AccessControl, type SystemRole } from "@/lib/access-control"
import { resolveAssignmentRate, findTimeConflict } from "@/lib/staffing"
import { checkStaffTests } from "@/lib/check-staff-tests"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const schedule = await sql`
      SELECT id FROM "GameSchedule" WHERE "leadId" = ${id} LIMIT 1
    `

    if (schedule.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const assignments = await sql`
      SELECT a.*, p.name as "personnelName"
      FROM "GameScheduleStaff" a
      JOIN "Personnel" p ON a."personnelId" = p.id
      WHERE a."scheduleId" = ${schedule[0].id}
    `

    return NextResponse.json({ success: true, data: assignments })
  } catch (error) {
    console.error("[v0] Error fetching staff:")
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { personnelId, role } = body

    const [lead] = await sql`
      SELECT "franchiseeId", "gameDate", "gameTime", "gameDuration", "clientName", "playersCount", "totalAmount",
             "animatorRate", "hostRate", "djRate",
             TO_CHAR("gameDate", 'YYYY-MM-DD') as "gameDay"
      FROM "GameLead" WHERE id = ${id}
    `
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }
    if (!canAccessFranchisee(user, lead.franchiseeId)) {
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
    const rate = resolveAssignmentRate(body.rate, role, lead, canSetRate)

    let schedule = await sql`
      SELECT id, "franchiseeId" FROM "GameSchedule" WHERE "leadId" = ${id} LIMIT 1
    `

    if (schedule.length === 0) {
      // GameSchedule.gameDate is NOT NULL — refuse clearly instead of failing on INSERT
      if (!lead.gameDate) {
        return NextResponse.json({ error: "Сначала укажите дату игры" }, { status: 400 })
      }

      const scheduleId = globalThis.crypto.randomUUID()
      schedule = await sql`
        INSERT INTO "GameSchedule" (id, "leadId", "franchiseeId", "gameDate", "gameTime", "clientName", "playersCount", "createdAt")
        VALUES (${scheduleId}, ${id}, ${lead.franchiseeId}, ${lead.gameDate || null}, ${lead.gameTime || null}, ${lead.clientName || null}, ${lead.playersCount || 0}, NOW())
        RETURNING id, "franchiseeId"
      `
    }

    // The person must belong to the same franchisee as the game. Without this a
    // caller could attach (and, via the conflict message, learn about) another
    // franchisee's staff.
    const [person] = await sql`SELECT "franchiseeId" FROM "Personnel" WHERE id = ${personnelId}`
    if (!person) {
      return NextResponse.json({ error: "Personnel not found" }, { status: 404 })
    }
    if (person.franchiseeId !== lead.franchiseeId) {
      return NextResponse.json({ error: "Сотрудник относится к другой франшизе" }, { status: 403 })
    }

    // Check if staff has passed required tests
    const testError = await checkStaffTests(personnelId, role)
    if (testError) {
      return NextResponse.json({ error: testError }, { status: 400 })
    }

    // Double booking: same person on another game that overlaps in time the same day.
    if (lead.gameDate) {
      const others = await sql`
        SELECT gs.id, gs."clientName", gs."gameTime", COALESCE(gl."gameDuration", 3) as duration
        FROM "GameScheduleStaff" gss
        JOIN "GameSchedule" gs ON gs.id = gss."scheduleId"
        LEFT JOIN "GameLead" gl ON gl.id = gs."leadId"
        WHERE gss."personnelId" = ${personnelId}
          AND gs."franchiseeId" = ${lead.franchiseeId}
          AND gs.id <> ${schedule[0].id}
          AND DATE(gs."gameDate") = ${lead.gameDay}::date
      `
      const conflict = findTimeConflict({ gameTime: lead.gameTime, duration: lead.gameDuration }, others)
      if (conflict) {
        return NextResponse.json(
          { error: `Сотрудник уже назначен на игру в это время: ${conflict.clientName || "без имени"} в ${conflict.gameTime}` },
          { status: 409 },
        )
      }
    }

    // Get personnel name
    const [personnel] = await sql`SELECT name FROM "Personnel" WHERE id = ${personnelId}`

    const staffAssignmentId = globalThis.crypto.randomUUID()
    const [assignment] = await sql`
      INSERT INTO "GameScheduleStaff" (id, "scheduleId", "personnelId", role, rate)
      VALUES (${staffAssignmentId}, ${schedule[0].id}, ${personnelId}, ${role}, ${rate})
      ON CONFLICT ("scheduleId", "personnelId") DO UPDATE SET role = ${role}, rate = ${rate}
      RETURNING *
    `

    const [leadInfo] = await sql`SELECT "franchiseeId", "clientName" FROM "GameLead" WHERE id = ${id}`
    const logId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "GameLeadLog" (id, "leadId", action, details, "pipelineId", "franchiseeId", "clientName")
      VALUES (${logId}, ${id}, 'staff_assign', ${personnel?.name + " (" + role + ")"}, NULL, ${leadInfo?.franchiseeId || null}, ${leadInfo?.clientName || null})
    `

    const roleLabel = role === "animator" ? "Аниматор" : role === "host" ? "Ведущий" : "DJ"
    const staffEventId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "GameLeadEvent" (id, "leadId", type, content)
      VALUES (${staffEventId}, ${id}, 'system', ${"Назначен " + roleLabel + ": " + personnel?.name})
    `

    return NextResponse.json({ success: true, data: { ...assignment, personnelName: personnel?.name } })
  } catch (error) {
    console.error("[v0] Error assigning staff:")
    return NextResponse.json({ error: "Failed to assign staff" }, { status: 500 })
  }
}
