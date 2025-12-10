import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const franchiseeId = searchParams.get("franchiseeId")

    let logs
    if (franchiseeId) {
      logs = await sql`
        SELECT l.*, u.name as "userName"
        FROM "GameLog" l
        LEFT JOIN "User" u ON l."userId" = u.id
        WHERE l."franchiseeId" = ${franchiseeId}
        ORDER BY l."createdAt" DESC
        LIMIT 200
      `
    } else {
      logs = await sql`
        SELECT l.*, u.name as "userName"
        FROM "GameLog" l
        LEFT JOIN "User" u ON l."userId" = u.id
        ORDER BY l."createdAt" DESC
        LIMIT 200
      `
    }

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error("[v0] Error fetching game logs:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}
