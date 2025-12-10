import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  try {
    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.userId as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Count unread notifications for the user
    const result = await sql`
      SELECT COUNT(*) as count
      FROM "Notification"
      WHERE "recipientId" = ${user.id}
        AND "isRead" = false
        AND "isArchived" = false
    `

    return NextResponse.json({ count: Number.parseInt(result[0]?.count || "0") })
  } catch (error) {
    console.error("[v0] Error counting notifications:", error)
    return NextResponse.json({ count: 0 })
  }
}
