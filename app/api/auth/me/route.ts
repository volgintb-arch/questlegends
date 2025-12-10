import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)

    const userId = payload.userId as string

    console.log("[v0] Auth me - userId from JWT:", userId)

    const sql = neon(process.env.DATABASE_URL!)

    const users = await sql`
      SELECT 
        u.id, u.phone, u.name, u.role, u."isActive", u."franchiseeId", u.email,
        f.name as "franchiseeName", f.city as "franchiseeCity"
      FROM "User" u
      LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
      WHERE u.id = ${userId}
      LIMIT 1
    `

    if (users.length === 0 || !users[0].isActive) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 401 })
    }

    const user = users[0]

    console.log("[v0] Auth me - user from DB:", {
      id: user.id,
      name: user.name,
      role: user.role,
      franchiseeId: user.franchiseeId,
    })

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
