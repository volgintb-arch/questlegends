import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    console.error("[v0] Error fetching staff:", error)
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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

      schedule = await sql`
        INSERT INTO "GameSchedule" ("leadId", "franchiseeId", "gameDate", "gameTime", "clientName", "playersCount", "totalAmount")
        VALUES (${id}, ${lead.franchiseeId}, ${lead.gameDate}, ${lead.gameTime}, ${lead.clientName}, ${lead.playersCount}, ${lead.totalAmount})
        RETURNING id, "franchiseeId"
      `
    }

    // Get personnel name
    const [personnel] = await sql`SELECT name FROM "Personnel" WHERE id = ${personnelId}`

    const [assignment] = await sql`
      INSERT INTO "GameScheduleStaff" ("scheduleId", "personnelId", role, rate)
      VALUES (${schedule[0].id}, ${personnelId}, ${role}, ${rate || 0})
      ON CONFLICT ("scheduleId", "personnelId") DO UPDATE SET role = ${role}, rate = ${rate || 0}
      RETURNING *
    `

    await sql`
      INSERT INTO "GameLeadLog" ("leadId", action, details, "pipelineId")
      VALUES (${id}, 'staff_assign', ${personnel?.name + " (" + role + ")"}, NULL)
    `

    const roleLabel = role === "animator" ? "Аниматор" : role === "host" ? "Ведущий" : "DJ"
    await sql`
      INSERT INTO "GameLeadEvent" ("leadId", type, content)
      VALUES (${id}, 'system', ${"Назначен " + roleLabel + ": " + personnel?.name})
    `

    return NextResponse.json({ success: true, data: { ...assignment, personnelName: personnel?.name } })
  } catch (error) {
    console.error("[v0] Error assigning staff:", error)
    return NextResponse.json({ error: "Failed to assign staff" }, { status: 500 })
  }
}
