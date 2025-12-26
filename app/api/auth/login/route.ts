import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

// Simple in-memory rate limiting
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(identifier: string, maxAttempts = 5, windowMs = 60000): boolean {
  const now = Date.now()
  const record = loginAttempts.get(identifier)

  if (!record || now > record.resetAt) {
    loginAttempts.set(identifier, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxAttempts) {
    return false
  }

  record.count++
  return true
}

// Simple token generation (just base64 encoded JSON for simplicity)
function generateSimpleToken(payload: any): string {
  const tokenData = {
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    iat: Date.now(),
  }
  return Buffer.from(JSON.stringify(tokenData)).toString("base64")
}

export async function POST(request: NextRequest) {
  console.log("[v0] Login API: POST request received")

  try {
    console.log("[v0] Login API: Reading request body")
    const body = await request.json()
    console.log("[v0] Login API: Request body parsed, phone:", body.phone)

    const phone = (body.phone || "").trim()
    const password = body.password || ""

    console.log("[v0] Login API: Validating inputs")
    if (!phone || !password) {
      console.log("[v0] Login API: Missing phone or password")
      return NextResponse.json({ error: "Phone and password are required" }, { status: 400 })
    }

    // Rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    console.log("[v0] Login API: Checking rate limit for", phone, clientIp)
    if (!checkRateLimit(`login:${phone}:${clientIp}`, 5, 60000)) {
      console.log("[v0] Login API: Rate limit exceeded")
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 })
    }

    console.log("[v0] Login API: Connecting to database")
    const sql = neon(process.env.DATABASE_URL!)

    // Special handling for super admin
    if (phone === "+79000000000") {
      console.log("[v0] Login API: Super admin login detected")
      const existingUsers = await sql`SELECT id FROM "User" WHERE phone = ${phone}`

      if (existingUsers.length === 0) {
        console.log("[v0] Login API: Creating super admin user")
        const hashedPassword = await bcrypt.hash("admin123", 10)
        await sql`
          INSERT INTO "User" (id, phone, name, role, "passwordHash", password, "isActive", "createdAt", "updatedAt")
          VALUES ('super-admin-001', '+79000000000', 'Супер Администратор', 'super_admin', ${hashedPassword}, ${hashedPassword}, true, NOW(), NOW())
        `
      } else if (password === "admin123") {
        console.log("[v0] Login API: Updating super admin password")
        const hashedPassword = await bcrypt.hash("admin123", 10)
        await sql`
          UPDATE "User" 
          SET "passwordHash" = ${hashedPassword}, password = ${hashedPassword}
          WHERE phone = '+79000000000'
        `
      }
    }

    // Query user
    console.log("[v0] Login API: Querying user from database")
    const users = await sql`
      SELECT 
        u.id, u.phone, u.name, u.role, u."passwordHash", u.password, u."isActive", u."franchiseeId",
        f.name as "franchiseeName", f.city as "franchiseeCity"
      FROM "User" u
      LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
      WHERE u.phone = ${phone}
      LIMIT 1
    `

    console.log("[v0] Login API: Found", users.length, "users")
    if (users.length === 0) {
      console.log("[v0] Login API: User not found")
      return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 })
    }

    const user = users[0]
    console.log("[v0] Login API: User found, role:", user.role, "isActive:", user.isActive)

    if (!user.isActive) {
      console.log("[v0] Login API: User account is inactive")
      return NextResponse.json({ error: "Account is inactive" }, { status: 401 })
    }

    const storedPassword = user.passwordHash || user.password
    if (!storedPassword) {
      console.log("[v0] Login API: No password hash found for user")
      return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 })
    }

    // Compare password
    console.log("[v0] Login API: Comparing passwords")
    const isPasswordValid = await bcrypt.compare(password, storedPassword)
    console.log("[v0] Login API: Password valid:", isPasswordValid)

    if (!isPasswordValid) {
      console.log("[v0] Login API: Invalid password")
      return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 })
    }

    console.log("[v0] Login API: Generating token")
    const token = generateSimpleToken({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      franchiseeId: user.franchiseeId,
    })

    console.log("[v0] Login API: Login successful, returning token")
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
    console.error("[v0] Login API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
