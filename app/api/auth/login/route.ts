import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import bcrypt from "bcryptjs"
import { rateLimit } from "@/lib/rate-limit"
import { createSignedToken } from "@/lib/simple-auth"
import { logApiError } from "@/lib/app-logger"
import { logUserLogin } from "@/lib/audit-log"

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
        u.email, u."avatarUrl", u."telegramId", u.telegram, u."onboardingCompleted",
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

    // Audit: логируем успешный вход
    logUserLogin(user.id, user.name, user.role, user.franchiseeId || null, clientIp).catch(() => {})

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        email: user.email || "",
        avatarUrl: user.avatarUrl || null,
        telegram_id: user.telegramId || user.telegram || "",
        franchiseeId: user.franchiseeId,
        franchiseeName: user.franchiseeName,
        franchiseeCity: user.franchiseeCity,
        onboardingCompleted: user.onboardingCompleted ?? false,
      },
    })
  } catch (error: any) {
    console.error("[login] Login failed:", error?.message || error)
    if (error?.stack) console.error(error.stack)
    if (error?.code) console.error("[login] PG code:", error.code, "detail:", error?.detail)
    await logApiError(error, request).catch(() => {})
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
