import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(req: NextRequest) {
  const user = await verifyRequest(req)
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(req.url)
    const franchiseeId = searchParams.get("franchiseeId")

    const isGlobalRole = ["uk", "super_admin", "uk_employee"].includes(user.role)

    let logs
    if (isGlobalRole && franchiseeId) {
      logs = await sql`
        SELECT l.*, u.name as "userName"
        FROM "GameLog" l
        LEFT JOIN "User" u ON l."userId" = u.id
        WHERE l."franchiseeId" = ${franchiseeId}
        ORDER BY l."createdAt" DESC
        LIMIT 200
      `
    } else if (isGlobalRole) {
      logs = await sql`
        SELECT l.*, u.name as "userName"
        FROM "GameLog" l
        LEFT JOIN "User" u ON l."userId" = u.id
        ORDER BY l."createdAt" DESC
        LIMIT 200
      `
    } else {
      // Non-global roles can only see logs for their own franchisee
      if (!user.franchiseeId) {
        return NextResponse.json({ success: true, data: [] })
      }
      logs = await sql`
        SELECT l.*, u.name as "userName"
        FROM "GameLog" l
        LEFT JOIN "User" u ON l."userId" = u.id
        WHERE l."franchiseeId" = ${user.franchiseeId}
        ORDER BY l."createdAt" DESC
        LIMIT 200
      `
    }

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error("[game-logs] GET error")
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}
