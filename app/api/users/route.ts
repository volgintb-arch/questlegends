import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

console.log("[v0] Users API module loaded")

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("Authorization")
  const token = authHeader?.replace("Bearer ", "")

  console.log("[v0] Token from header:", token ? "exists" : "missing")

  if (!token) {
    return null
  }

  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)
    console.log("[v0] JWT verified, userId:", payload.userId)
    return {
      id: payload.userId,
      phone: payload.phone,
      name: payload.name,
      role: payload.role,
      franchiseeId: payload.franchiseeId,
    }
  } catch (error: any) {
    console.log("[v0] JWT verify error:", error.message)
    return null
  }
}

export async function GET(request: Request) {
  console.log("[v0] Users API GET started")

  try {
    const user = await getCurrentUser(request)
    console.log("[v0] Current user:", user ? user.id : "none")

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    console.log("[v0] User role:", user.role, "franchiseeId:", user.franchiseeId)

    let users

    if (user.role === "franchisee" || user.role === "admin") {
      users = await sql`
        SELECT 
          u.id, u.phone, u.name, u.role, u.telegram, u.whatsapp, 
          u."telegramId", u.description, u."isActive", u."createdAt",
          f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity"
        FROM "User" u
        LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
        WHERE u."franchiseeId" = ${user.franchiseeId}
        ORDER BY u."createdAt" DESC
      `
    } else if (franchiseeId) {
      users = await sql`
        SELECT 
          u.id, u.phone, u.name, u.role, u.telegram, u.whatsapp, 
          u."telegramId", u.description, u."isActive", u."createdAt",
          f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity"
        FROM "User" u
        LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
        WHERE u."franchiseeId" = ${franchiseeId}
        ORDER BY u."createdAt" DESC
      `
    } else {
      users = await sql`
        SELECT 
          u.id, u.phone, u.name, u.role, u.telegram, u.whatsapp, 
          u."telegramId", u.description, u."isActive", u."createdAt",
          f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity"
        FROM "User" u
        LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
        ORDER BY u."createdAt" DESC
      `
    }

    console.log("[v0] Found users:", users.length)

    const formattedUsers = users.map((u: any) => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      role: u.role,
      telegram: u.telegram,
      whatsapp: u.whatsapp,
      telegramId: u.telegramId,
      description: u.description,
      isActive: u.isActive,
      createdAt: u.createdAt,
      franchisee: u.franchiseeId
        ? {
            id: u.franchiseeId,
            name: u.franchiseeName,
            city: u.franchiseeCity,
          }
        : null,
    }))

    return NextResponse.json(formattedUsers)
  } catch (error: any) {
    console.error("[v0] USERS_GET error:", error.message)
    return NextResponse.json({ error: "Internal error", details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Creating new user - start")

    const bcrypt = await import("bcryptjs")

    const user = await getCurrentUser(request)
    if (!user) {
      console.log("[v0] No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Session user:", user.id, user.role)

    const body = await request.json()
    console.log("[v0] Request body:", JSON.stringify(body, null, 2))

    const {
      phone,
      name,
      role,
      telegram,
      whatsapp,
      telegramId,
      description,
      permissions,
      password,
      franchiseeId,
      email,
      city,
    } = body

    if (!name || !role) {
      return NextResponse.json({ error: "Name and role are required" }, { status: 400 })
    }

    if (role === "franchisee" && !city) {
      return NextResponse.json({ error: "City is required for franchisee role" }, { status: 400 })
    }

    if (["animator", "host", "dj", "admin"].includes(role) && !franchiseeId && !user.franchiseeId) {
      return NextResponse.json({ error: "Franchisee is required for admin and personnel roles" }, { status: 400 })
    }

    if (user.role === "admin") {
      if (!["animator", "host", "dj"].includes(role)) {
        return NextResponse.json(
          { error: "Admins can only create personnel roles (animator, host, dj)" },
          { status: 403 },
        )
      }
    }

    if (user.role === "franchisee") {
      if (!["admin", "animator", "host", "dj"].includes(role)) {
        return NextResponse.json({ error: "Franchisee can only create admin and personnel roles" }, { status: 403 })
      }
    }

    if (user.role === "uk") {
      if (!["franchisee", "uk_employee"].includes(role)) {
        return NextResponse.json({ error: "UK can only create franchisee and uk_employee roles" }, { status: 403 })
      }
    }

    const sql = neon(process.env.DATABASE_URL!)

    const userEmail =
      email ||
      (phone
        ? `${phone.replace(/\D/g, "")}@questlegends.com`
        : `${name.toLowerCase().replace(/\s+/g, ".")}@questlegends.com`)

    const tempPassword = password || Math.random().toString(36).slice(-8)
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    let userFranchiseeId = franchiseeId || user.franchiseeId

    if (role === "franchisee" && city && user.role === "uk") {
      console.log("[v0] Creating franchisee record for city:", city)

      const franchiseeName = `${city} - ${name}`
      const franchiseeAddress = `г. ${city}`

      const newFranchisee = await sql`
        INSERT INTO "Franchisee" (name, city, address)
        VALUES (${franchiseeName}, ${city}, ${franchiseeAddress})
        RETURNING id
      `

      console.log("[v0] Franchisee created:", newFranchisee[0].id)
      userFranchiseeId = newFranchisee[0].id
    }

    if (user.role === "uk" && role === "uk_employee") {
      userFranchiseeId = null
    }

    const finalRole = ["animator", "host", "dj"].includes(role) ? "employee" : role

    console.log("[v0] Creating user with role:", finalRole, "email:", userEmail, "franchiseeId:", userFranchiseeId)

    const newUser = await sql`
      INSERT INTO "User" (phone, email, "passwordHash", name, role, telegram, whatsapp, "telegramId", description, "franchiseeId")
      VALUES (${phone || null}, ${userEmail}, ${passwordHash}, ${name}, ${finalRole}, ${telegram || null}, ${whatsapp || null}, ${telegramId || null}, ${description || null}, ${userFranchiseeId})
      RETURNING id, phone, email, name, role, telegram, whatsapp, "telegramId"
    `

    console.log("[v0] User created successfully:", newUser[0].id)

    if (["animator", "host", "dj"].includes(role) && userFranchiseeId) {
      console.log("[v0] Creating personnel record for user:", newUser[0].id)
      await sql`
        INSERT INTO "Personnel" ("franchiseeId", name, role, phone, telegram, whatsapp, "userId")
        VALUES (${userFranchiseeId}, ${name}, ${role}, ${phone || null}, ${telegram || null}, ${whatsapp || null}, ${newUser[0].id})
      `
      console.log("[v0] Personnel record created")
    }

    if (role === "admin" && permissions) {
      await sql`
        INSERT INTO "UserPermission" ("userId", "canViewDeals", "canEditDeals", "canViewFinances", "canViewMarketing", "canViewKb", "canViewSchedule", "canViewPersonnel")
        VALUES (${newUser[0].id}, ${permissions.canViewDeals || false}, ${permissions.canEditDeals || false}, ${permissions.canViewFinances || false}, ${permissions.canViewMarketing || false}, ${permissions.canViewKb || false}, ${permissions.canViewSchedule || false}, ${permissions.canViewPersonnel || false})
      `
    }

    return NextResponse.json({ user: newUser[0], tempPassword })
  } catch (error: any) {
    console.error("[v0] USERS_POST error:", error.message)
    return NextResponse.json({ error: "Internal error", details: error.message }, { status: 500 })
  }
}
