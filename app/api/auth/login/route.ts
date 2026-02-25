import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { rateLimit } from "@/lib/rate-limit"
import { createSignedToken } from "@/lib/simple-auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const phone = (body.phone || "").trim()
    const password = body.password || ""

    if (!phone || !password) {
      return NextResponse.json({ error: "Phone and password are required" }, { status: 400 })
    }

    // Rate limiting: 5 attempts per minute per IP+phone
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const { success: rateLimitOk } = rateLimit(`login:${phone}:${clientIp}`)
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Слишком много попыток входа. Попробуйте через минуту." },
        { status: 429 },
      )
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Query user — select only necessary fields, never return password columns
    const users = await sql`
      SELECT
        u.id, u.phone, u.name, u.role, u."passwordHash", u."isActive", u."franchiseeId",
        f.name as "franchiseeName", f.city as "franchiseeCity"
      FROM "User" u
      LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
      WHERE u.phone = ${phone}
      LIMIT 1
    `

    // Use identical error for missing user and wrong password to prevent user enumeration
    const genericError = NextResponse.json({ error: "Invalid phone or password" }, { status: 401 })

    if (users.length === 0) {
      return genericError
    }

    const user = users[0]

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is inactive" }, { status: 401 })
    }

    if (!user.passwordHash) {
      return genericError
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      return genericError
    }

    const token = await createSignedToken({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      franchiseeId: user.franchiseeId,
    })

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
    console.error("[login] Login error occurred")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
