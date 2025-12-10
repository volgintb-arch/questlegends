import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    if (!franchiseeId) {
      return NextResponse.json({ success: false, error: "franchiseeId is required" }, { status: 400 })
    }

    const games = await sql`
      SELECT 
        g.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', gs.id,
              'personnelId', gs."personnelId",
              'name', u.name,
              'role', gs.role,
              'rate', gs.rate
            )
          ) FILTER (WHERE gs.id IS NOT NULL),
          '[]'
        ) as "assignedStaff"
      FROM "Game" g
      LEFT JOIN "GameStaff" gs ON g.id = gs."gameId"
      LEFT JOIN "Personnel" p ON gs."personnelId" = p.id
      LEFT JOIN "User" u ON p."userId" = u.id
      WHERE g."franchiseeId" = ${franchiseeId}
      GROUP BY g.id
      ORDER BY g."gameDate" DESC, g."gameStartTime" DESC
    `

    return NextResponse.json({ success: true, games })
  } catch (error) {
    console.error("[v0] Games GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch games" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      franchiseeId,
      clientName,
      clientPhone,
      gameDate,
      gameStartTime,
      gameEndTime,
      playersCount,
      packageType,
      packagePrice,
      animatorsCount,
      hostsCount,
      djsCount,
      animatorRate,
      hostRate,
      djRate,
      prepayment,
      notes,
      totalAmount,
    } = body

    const result = await sql`
      INSERT INTO "Game" (
        "franchiseeId", "clientName", "clientPhone", "gameDate", "gameStartTime", "gameEndTime",
        "playersCount", "packageType", "packagePrice", "animatorsCount", "hostsCount", "djsCount",
        "animatorRate", "hostRate", "djRate", "prepayment", "notes", "totalAmount", "status"
      ) VALUES (
        ${franchiseeId}, ${clientName}, ${clientPhone}, ${gameDate}, ${gameStartTime}, ${gameEndTime},
        ${playersCount}, ${packageType}, ${packagePrice}, ${animatorsCount || 0}, ${hostsCount || 0}, ${djsCount || 0},
        ${animatorRate || 1500}, ${hostRate || 2000}, ${djRate || 2500}, ${prepayment || 0}, ${notes || ""}, ${totalAmount}, 'pending'
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, game: result[0] })
  } catch (error) {
    console.error("[v0] Games POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to create game" }, { status: 500 })
  }
}
