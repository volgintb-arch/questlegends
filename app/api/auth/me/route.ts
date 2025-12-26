import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyRequest(request)

    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    const users = await sql`
      SELECT 
        u.id, u.phone, u.name, u.role, u."isActive", u."franchiseeId", u.email,
        f.name as "franchiseeName", f.city as "franchiseeCity"
      FROM "User" u
      LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
      WHERE u.id = ${payload.userId}
      LIMIT 1
    `

    if (users.length === 0 || !users[0].isActive) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 401 })
    }

    const user = users[0]

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        email: user.email,
        franchiseeId: user.franchiseeId,
        franchiseeName: user.franchiseeName,
        franchiseeCity: user.franchiseeCity,
      },
    })
  } catch (error: any) {
    console.error("[v0] Auth me error:", error)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
}
