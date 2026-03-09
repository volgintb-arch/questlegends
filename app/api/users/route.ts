import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { verifyRequest } from "@/lib/simple-auth"
import { cache } from "@/lib/cache"

// getCurrentUser is unused — authentication is handled via verifyRequest from simple-auth

export async function GET(request: Request) {
  try {
    const user = await verifyRequest(request as any)

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")
    const roleFilter = searchParams.get("role")
    const rolesFilter = searchParams.get("roles")

    let users

    if (rolesFilter) {
      const roles = rolesFilter.split(",")
      if (user.role === "franchisee" || user.role === "own_point" || user.role === "admin") {
        users = await sql`
          SELECT 
            u.id, u.phone, u.name, u.role, u.telegram, u.whatsapp,
            u."telegramId", u.description, u."avatarUrl", u."isActive", u."createdAt",
            f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity",
            p.role as "personnelRole"
          FROM "User" u
          LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
          LEFT JOIN "Personnel" p ON p."userId" = u.id
          WHERE u."franchiseeId" = ${user.franchiseeId}
            AND u.role = ANY(${roles})
          ORDER BY u.name ASC
        `
      } else {
        users = await sql`
          SELECT 
            u.id, u.phone, u.name, u.role, u.telegram, u.whatsapp,
            u."telegramId", u.description, u."avatarUrl", u."isActive", u."createdAt",
            f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity",
            p.role as "personnelRole"
          FROM "User" u
          LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
          LEFT JOIN "Personnel" p ON p."userId" = u.id
          WHERE u.role = ANY(${roles})
          ORDER BY u.name ASC
        `
      }
    } else if (roleFilter === "uk_employee") {
      users = await sql`
        SELECT
          u.id, u.phone, u.name, u.role, u.telegram, u.whatsapp,
          u."telegramId", u.description, u."avatarUrl", u."isActive", u."createdAt",
          f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity"
        FROM "User" u
        LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
        WHERE u.role = 'uk_employee'
        ORDER BY u.name ASC
      `
    } else if (roleFilter === "uk") {
      users = await sql`
        SELECT 
          u.id, u.phone, u.name, u.role, u.telegram, u.whatsapp,
          u."telegramId", u.description, u."avatarUrl", u."isActive", u."createdAt",
          f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity"
        FROM "User" u
        LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
        WHERE u.role IN ('uk', 'uk_employee')
        ORDER BY u."createdAt" DESC
      `
    } else if (user.role === "franchisee" || user.role === "own_point" || user.role === "admin") {
      users = await sql`
        SELECT
          u.id, u.phone, u.name, u.role, u.telegram, u.whatsapp,
          u."telegramId", u.description, u."avatarUrl", u."isActive", u."createdAt",
          f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity",
          p.role as "personnelRole"
        FROM "User" u
        LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
        LEFT JOIN "Personnel" p ON p."userId" = u.id
        WHERE u."franchiseeId" = ${user.franchiseeId}
        ORDER BY u."createdAt" DESC
      `
    } else if (franchiseeId) {
      users = await sql`
        SELECT
          u.id, u.phone, u.name, u.role, u.telegram, u.whatsapp,
          u."telegramId", u.description, u."avatarUrl", u."isActive", u."createdAt",
          f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity",
          p.role as "personnelRole"
        FROM "User" u
        LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
        LEFT JOIN "Personnel" p ON p."userId" = u.id
        WHERE u."franchiseeId" = ${franchiseeId}
        ORDER BY u."createdAt" DESC
      `
    } else {
      users = await sql`
        SELECT
          u.id, u.phone, u.name, u.role, u.telegram, u.whatsapp,
          u."telegramId", u.description, u."avatarUrl", u."isActive", u."createdAt",
          f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity",
          p.role as "personnelRole"
        FROM "User" u
        LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
        LEFT JOIN "Personnel" p ON p."userId" = u.id
        ORDER BY u."createdAt" DESC
      `
    }

    const formattedUsers = users.map((u: any) => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      role: u.personnelRole || u.role,
      telegram: u.telegram,
      whatsapp: u.whatsapp,
      telegramId: u.telegramId,
      description: u.description,
      avatarUrl: u.avatarUrl || null,
      isActive: u.isActive,
      createdAt: u.createdAt,
      franchiseeId: u.franchiseeId || null,
      franchisee: u.franchiseeId
        ? {
            id: u.franchiseeId,
            name: u.franchiseeName,
            city: u.franchiseeCity,
          }
        : null,
    }))

    return NextResponse.json({ data: formattedUsers })
  } catch (error: any) {
    console.error("[users] GET error")
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyRequest(request as any)

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const allowedRoles = ["super_admin", "uk", "uk_employee", "franchisee", "own_point", "admin"]
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const rawBody = await request.json()

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
    } = rawBody

    if (!name || !role) {
      return NextResponse.json({ error: "Name and role are required" }, { status: 400 })
    }

    if ((role === "franchisee" || role === "own_point") && !city) {
      return NextResponse.json({ error: "City is required for franchisee/own_point role" }, { status: 400 })
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

    if (user.role === "franchisee" || user.role === "own_point") {
      if (!["admin", "animator", "host", "dj"].includes(role)) {
        return NextResponse.json(
          { error: "Franchisee/Own point can only create admin and personnel roles" },
          { status: 403 },
        )
      }
    }

    if (user.role === "uk" || user.role === "super_admin") {
      // UK Owner может создавать все подчинённые роли
      if (!["franchisee", "own_point", "uk_employee", "admin", "employee", "animator", "host", "dj"].includes(role)) {
        return NextResponse.json(
          { error: "UK can only create subordinate roles" },
          { status: 403 },
        )
      }
    } else if (user.role === "uk_employee") {
      if (!["franchisee", "own_point"].includes(role)) {
        return NextResponse.json(
          { error: "UK employees can only create franchisee and own_point roles" },
          { status: 403 },
        )
      }
    }

    const sql = neon(process.env.DATABASE_URL!)

    if (phone) {
      const existingUser = await sql`
        SELECT id FROM "User" WHERE phone = ${phone}
      `
      if (existingUser.length > 0) {
        return NextResponse.json({ error: "Пользователь с таким номером телефона уже существует" }, { status: 400 })
      }
    }

    const userEmail =
      email ||
      (phone
        ? `${phone.replace(/\D/g, "")}@questlegends.com`
        : `${name.toLowerCase().replace(/\s+/g, ".")}@questlegends.com`)

    const existingEmail = await sql`
      SELECT id FROM "User" WHERE email = ${userEmail}
    `
    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 400 })
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Пароль должен быть не менее 8 символов" }, { status: 400 })
    }
    // Store only the bcrypt hash — never store plaintext passwords
    const passwordHash = await bcrypt.hash(password, 12)

    let userFranchiseeId = franchiseeId || user.franchiseeId

    if (
      (role === "franchisee" || role === "own_point") &&
      city &&
      (user.role === "uk" || user.role === "super_admin" || user.role === "uk_employee")
    ) {
      const franchiseeUUID = uuidv4()
      const franchiseeName = role === "own_point" ? `Собственная точка - ${city} - ${name}` : `${city} - ${name}`
      const franchiseeAddress = `г. ${city}`

      const newFranchisee = await sql`
        INSERT INTO "Franchisee" (id, name, city, address, "royaltyPercent", "updatedAt")
        VALUES (${franchiseeUUID}, ${franchiseeName}, ${city}, ${franchiseeAddress}, ${role === "own_point" ? 0 : 10}, NOW())
        RETURNING id
      `

      userFranchiseeId = newFranchisee[0].id
    }

    if ((user.role === "uk" || user.role === "super_admin") && role === "uk_employee") {
      userFranchiseeId = null
    }

    const finalRole = ["animator", "host", "dj"].includes(role) ? "employee" : role === "own_point" ? "franchisee" : role

    const userUUID = uuidv4()
    const newUser = await sql`
      INSERT INTO "User" (id, phone, email, "passwordHash", name, role, telegram, whatsapp, "telegramId", description, "franchiseeId", "isActive", "createdAt", "updatedAt")
      VALUES (${userUUID}, ${phone || null}, ${userEmail}, ${passwordHash}, ${name}, ${finalRole}, ${telegram || null}, ${whatsapp || null}, ${telegramId || null}, ${description || null}, ${userFranchiseeId}, true, NOW(), NOW())
      RETURNING id, phone, email, name, role, telegram, whatsapp, "telegramId"
    `

    if (["animator", "host", "dj"].includes(role) && userFranchiseeId) {
      const personnelUUID = uuidv4()
      await sql`
        INSERT INTO "Personnel" (id, "franchiseeId", name, role, phone, telegram, whatsapp, "userId")
        VALUES (${personnelUUID}, ${userFranchiseeId}, ${name}, ${role}, ${phone || null}, ${telegram || null}, ${whatsapp || null}, ${newUser[0].id})
      `
    }

    if (role === "admin" && permissions) {
      const permId = uuidv4()
      await sql`
        INSERT INTO "UserPermission" (id, "userId", "canViewDeals", "canEditDeals", "canViewFinances", "canViewKnowledgeBase", "canManageSchedule", "canManagePersonnel", "updatedAt")
        VALUES (${permId}, ${newUser[0].id}, ${permissions.canViewDeals || false}, ${permissions.canEditDeals || false}, ${permissions.canViewFinances || false}, ${permissions.canViewKb || false}, ${permissions.canViewSchedule || false}, ${permissions.canViewPersonnel || false}, NOW())
      `
    }

    // Invalidate caches so new data appears immediately
    if (role === "franchisee" || role === "own_point") {
      await cache.invalidatePattern("franchisees:")
    }

    // Return created user — password is NOT included in response for security
    return NextResponse.json({ success: true, data: newUser[0] })
  } catch (error: any) {
    console.error("[users] POST error:", error?.message || error)
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 })
  }
}
