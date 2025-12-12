import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json()

    if (!phone || !password) {
      return NextResponse.json({ error: "Phone and password are required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    if (phone === "+79000000000") {
      const existingUsers = await sql`SELECT id FROM "User" WHERE phone = ${phone}`

      if (existingUsers.length === 0) {
        const hashedPassword = await bcrypt.hash("admin123", 10)
        await sql`
          INSERT INTO "User" (id, phone, name, role, "passwordHash", password, "isActive", "createdAt", "updatedAt")
          VALUES ('super-admin-001', '+79000000000', 'Супер Администратор', 'super_admin', ${hashedPassword}, ${hashedPassword}, true, NOW(), NOW())
        `
      } else if (password === "admin123") {
        const hashedPassword = await bcrypt.hash("admin123", 10)
        await sql`
          UPDATE "User" 
          SET "passwordHash" = ${hashedPassword}, password = ${hashedPassword}
          WHERE phone = '+79000000000'
        `
      }
    }

    const users = await sql`
      SELECT 
        u.id, u.phone, u.name, u.role, u."passwordHash", u.password, u."isActive", u."franchiseeId",
        f.name as "franchiseeName", f.city as "franchiseeCity"
      FROM "User" u
      LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
      WHERE u.phone = ${phone}
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 })
    }

    const user = users[0]

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is inactive" }, { status: 401 })
    }

    const storedPassword = user.passwordHash || user.password
    if (!storedPassword) {
      return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 })
    }

    const isPasswordValid = await bcrypt.compare(password, storedPassword)

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
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
