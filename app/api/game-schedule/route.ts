import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const franchiseeId = searchParams.get("franchiseeId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const personnelId = searchParams.get("personnelId")


    if (personnelId) {
      const schedules = await sql`
        SELECT DISTINCT
          gs.id,
          gs."leadId",
          gs."franchiseeId",
          TO_CHAR(gs."gameDate", 'YYYY-MM-DD') as "gameDate",
          gs."gameTime",
          gs."clientName",
          gs."playersCount",
          gs."createdAt",
          COALESCE(gl."animatorsCount", 0) as "animatorsNeeded",
          COALESCE(gl."hostsCount", 0) as "hostsNeeded",
          COALESCE(gl."djsCount", 0) as "djsNeeded",
          COALESCE(gl."gameDuration", 3) as "gameDuration"
        FROM "GameSchedule" gs
        LEFT JOIN "GameLead" gl ON gs."leadId" = gl.id
        LEFT JOIN "GameScheduleStaff" gss ON gs.id = gss."scheduleId"
        WHERE gss."personnelId" = ${personnelId}
        ORDER BY gs."gameDate", gs."gameTime"
      `


      return NextResponse.json({ success: true, data: schedules })
    }

    if (!franchiseeId) {
      return NextResponse.json({ error: "franchiseeId is required" }, { status: 400 })
    }

    let schedules
    if (startDate && endDate) {
      schedules = await sql`
        SELECT 
          gs.id,
          gs."leadId",
          gs."franchiseeId",
          TO_CHAR(gs."gameDate", 'YYYY-MM-DD') as "gameDate",
          gs."gameTime",
          gs."clientName",
          gs."playersCount",
          gs."createdAt",
          COALESCE(gl."animatorsCount", 0) as "animatorsNeeded",
          COALESCE(gl."hostsCount", 0) as "hostsNeeded",
          COALESCE(gl."djsCount", 0) as "djsNeeded",
          COALESCE(gl."gameDuration", 3) as "gameDuration"
        FROM "GameSchedule" gs
        LEFT JOIN "GameLead" gl ON gs."leadId" = gl.id
        WHERE gs."franchiseeId" = ${franchiseeId}
          AND gs."gameDate" >= ${startDate}::date
          AND gs."gameDate" <= ${endDate}::date
        ORDER BY gs."gameDate", gs."gameTime"
      `
    } else {
      schedules = await sql`
        SELECT 
          gs.id,
          gs."leadId",
          gs."franchiseeId",
          TO_CHAR(gs."gameDate", 'YYYY-MM-DD') as "gameDate",
          gs."gameTime",
          gs."clientName",
          gs."playersCount",
          gs."createdAt",
          COALESCE(gl."animatorsCount", 0) as "animatorsNeeded",
          COALESCE(gl."hostsCount", 0) as "hostsNeeded",
          COALESCE(gl."djsCount", 0) as "djsNeeded",
          COALESCE(gl."gameDuration", 3) as "gameDuration"
        FROM "GameSchedule" gs
        LEFT JOIN "GameLead" gl ON gs."leadId" = gl.id
        WHERE gs."franchiseeId" = ${franchiseeId}
        ORDER BY gs."gameDate", gs."gameTime"
      `
    }

    // Get staff for each schedule
    for (const schedule of schedules) {
      const staff = await sql`
        SELECT gss.*, p.name as "personnelName"
        FROM "GameScheduleStaff" gss
        JOIN "Personnel" p ON gss."personnelId" = p.id
        WHERE gss."scheduleId" = ${schedule.id}
      `
      schedule.staff = staff
    }

    return NextResponse.json({ success: true, data: schedules })
  } catch (error) {
    console.error("[v0] Error fetching schedule:")
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 })
  }
}
