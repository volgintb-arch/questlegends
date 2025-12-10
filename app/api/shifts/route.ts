import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const franchiseeId = searchParams.get("franchiseeId")
    const personnelId = searchParams.get("personnelId")
    const userId = searchParams.get("userId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    console.log("[v0] Shifts API GET:", { userId, franchiseeId, personnelId, startDate, endDate })

    if (userId) {
      // Find personnel record for this user
      const personnelRecords = await sql`
        SELECT id FROM "Personnel" WHERE "userId" = ${userId}
      `

      if (personnelRecords.length === 0) {
        console.log("[v0] No personnel record found for userId:", userId)
        return NextResponse.json({ success: true, data: [] })
      }

      const personnelIdFromUser = personnelRecords[0].id

      const shifts = await sql`
        SELECT 
          gs.id,
          gs."leadId",
          gs."franchiseeId",
          gs."gameDate",
          gs."gameTime",
          gs."clientName",
          gs."playersCount",
          gs."totalAmount",
          gs."status",
          gs."createdAt",
          COALESCE(gl."gameDuration", 3) as "gameDuration",
          gl."clientName" as "leadClientName",
          gl."notes" as "gameNotes",
          f.name as "franchiseeName"
        FROM "GameSchedule" gs
        LEFT JOIN "GameLead" gl ON gs."leadId" = gl.id
        LEFT JOIN "Franchisee" f ON gs."franchiseeId" = f.id
        INNER JOIN "GameScheduleStaff" gss ON gs.id = gss."scheduleId"
        WHERE gss."personnelId" = ${personnelIdFromUser}
        ORDER BY gs."gameDate", gs."gameTime"
      `

      console.log("[v0] Found shifts for employee:", shifts.length)

      return NextResponse.json({ success: true, data: shifts })
    }

    if (!franchiseeId) {
      return NextResponse.json({ error: "franchiseeId or userId is required" }, { status: 400 })
    }

    let query = `
      SELECT 
        gs.id,
        gs."leadId",
        gs."franchiseeId",
        gs."gameDate",
        gs."gameTime",
        gs."clientName",
        gs."playersCount",
        gs."totalAmount",
        gs."status",
        gs."createdAt",
        COALESCE(gl."gameDuration", 3) as "gameDuration",
        gl."clientName" as "leadClientName",
        gl."notes" as "gameNotes"
      FROM "GameSchedule" gs
      LEFT JOIN "GameLead" gl ON gs."leadId" = gl.id
      LEFT JOIN "Franchisee" f ON gs."franchiseeId" = f.id
      LEFT JOIN "GameScheduleStaff" gss ON gs.id = gss."scheduleId"
      WHERE gs."franchiseeId" = $1
    `

    const params: any[] = [franchiseeId]
    let paramCount = 1

    if (personnelId) {
      paramCount++
      query += ` AND gss."personnelId" = $${paramCount}`
      params.push(personnelId)
    }

    if (startDate && endDate) {
      paramCount++
      query += ` AND gs."gameDate" >= $${paramCount}::date`
      params.push(startDate)

      paramCount++
      query += ` AND gs."gameDate" <= $${paramCount}::date`
      params.push(endDate)
    }

    query += ` ORDER BY gs."gameDate", gs."gameTime"`

    const shifts = await sql(query, params)

    console.log("[v0] Found shifts:", shifts.length)

    return NextResponse.json({ success: true, data: shifts })
  } catch (error) {
    console.error("[v0] SHIFTS_GET error:", error)
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 })
  }
}
