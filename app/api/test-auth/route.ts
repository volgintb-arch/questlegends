import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    console.log("[v0] Test auth: Starting")

    const body = await request.json()
    const { phone, password } = body

    console.log("[v0] Test auth: Received phone:", phone)

    if (!phone || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
    }

    console.log("[v0] Test auth: DATABASE_URL exists:", !!process.env.DATABASE_URL)

    const sql = neon(process.env.DATABASE_URL!)

    console.log("[v0] Test auth: SQL client created")

    const users = await sql`
      SELECT id, name, phone, role, "passwordHash", "isActive", "franchiseeId"
      FROM "User"
      WHERE phone = ${phone}
      LIMIT 1
    `

    console.log("[v0] Test auth: Query completed, found users:", users.length)

    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        message: "User not found",
      })
    }

    const user = users[0]

    console.log("[v0] Test auth: User data:", {
      id: user.id,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.passwordHash,
    })

    if (!user.isActive) {
      return NextResponse.json({
        success: false,
        message: "User is not active",
      })
    }

    if (!user.passwordHash) {
      return NextResponse.json({
        success: false,
        message: "User has no password set",
      })
    }

    console.log("[v0] Test auth: Comparing passwords")
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    console.log("[v0] Test auth: Password valid:", isPasswordValid)

    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        message: "Invalid password",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        franchiseeId: user.franchiseeId,
      },
    })
  } catch (error) {
    console.error("[v0] Test auth error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
