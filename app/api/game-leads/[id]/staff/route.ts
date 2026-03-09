import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"
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
    const { personnelId, role, rate } = body

    let schedule = await sql`
      SELECT id, "franchiseeId" FROM "GameSchedule" WHERE "leadId" = ${id} LIMIT 1
    `

    if (schedule.length === 0) {
      // Get lead data to create schedule
      const [lead] = await sql`
        SELECT "franchiseeId", "gameDate", "gameTime", "clientName", "playersCount", "totalAmount" 
        FROM "GameLead" WHERE id = ${id}
      `

      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 })
      }

      const scheduleId = globalThis.crypto.randomUUID()
      schedule = await sql`
        INSERT INTO "GameSchedule" (id, "leadId", "franchiseeId", "gameDate", "gameTime", "clientName", "playersCount", "createdAt")
        VALUES (${scheduleId}, ${id}, ${lead.franchiseeId}, ${lead.gameDate || null}, ${lead.gameTime || null}, ${lead.clientName || null}, ${lead.playersCount || 0}, NOW())
        RETURNING id, "franchiseeId"
      `
    }

    // Check if staff has passed required tests
    const testError = await checkStaffTests(personnelId, role)
    if (testError) {
      return NextResponse.json({ error: testError }, { status: 400 })
    }

    // Get personnel name
    const [personnel] = await sql`SELECT name FROM "Personnel" WHERE id = ${personnelId}`

    const staffAssignmentId = globalThis.crypto.randomUUID()
    const [assignment] = await sql`
      INSERT INTO "GameScheduleStaff" (id, "scheduleId", "personnelId", role, rate)
      VALUES (${staffAssignmentId}, ${schedule[0].id}, ${personnelId}, ${role}, ${rate || 0})
      ON CONFLICT ("scheduleId", "personnelId") DO UPDATE SET role = ${role}, rate = ${rate || 0}
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
