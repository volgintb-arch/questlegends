import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json()

    console.log("[v0] Login attempt for phone:", phone)

    if (!phone || !password) {
      return NextResponse.json({ error: "Phone and password are required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    const users = await sql`
      SELECT 
        u.id, u.phone, u.name, u.role, u."passwordHash", u.password, u."isActive", u."franchiseeId",
        f.name as "franchiseeName", f.city as "franchiseeCity"
      FROM "User" u
      LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
      WHERE u.phone = ${phone}
      LIMIT 1
    `

    console.log("[v0] User query result:", users.length > 0 ? "User found" : "User not found")

    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 })
    }

    const user = users[0]

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is inactive" }, { status: 401 })
    }

    const storedPassword = user.passwordHash || user.password
    if (!storedPassword) {
      console.log("[v0] No password stored for user")
      return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 })
    }

    const isPasswordValid = await bcrypt.compare(password, storedPassword)

    console.log("[v0] Password check:", isPasswordValid ? "Valid" : "Invalid")

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")

    const token = await new SignJWT({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      franchiseeId: user.franchiseeId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret)

    console.log("[v0] JWT token created successfully")

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        franchiseeId: user.franchiseeId,
        franchiseeName: user.franchiseeName,
        franchiseeCity: user.franchiseeCity,
      },
    })
  } catch (error: any) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
