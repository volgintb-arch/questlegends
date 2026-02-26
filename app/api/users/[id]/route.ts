import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"
import bcrypt from "bcryptjs"

// Safe user fields — never include passwordHash or password columns
const USER_SAFE_FIELDS = `
  u.id, u.phone, u.email, u.name, u.role, u.telegram, u.whatsapp,
  u."telegramId", u.description, u."isActive", u."franchiseeId", u."createdAt", u."updatedAt",
  f.name as "franchiseeName"
`

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const sql = neon(process.env.DATABASE_URL!)

    const users = await sql`
      SELECT ${sql.unsafe(USER_SAFE_FIELDS)}
      FROM "User" u
      LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
      WHERE u.id = ${id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: users[0] })
  } catch (error) {
    console.error("[users/id] GET error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await verifyRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const sql = neon(process.env.DATABASE_URL!)

    // Fetch only needed fields to check permissions
    const existing = await sql`
      SELECT id, role, "franchiseeId" FROM "User" WHERE id = ${id}
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const targetUser = existing[0]
    const canEdit =
      currentUser.role === "super_admin" ||
      (currentUser.role === "uk" && ["uk_employee", "franchisee"].includes(targetUser.role)) ||
      (currentUser.role === "franchisee" &&
        targetUser.franchiseeId === currentUser.franchiseeId &&
        ["admin", "employee", "animator", "host", "dj"].includes(targetUser.role))

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (body.name !== undefined) {
      await sql`UPDATE "User" SET name = ${body.name}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.phone !== undefined) {
      await sql`UPDATE "User" SET phone = ${body.phone}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.role !== undefined) {
      await sql`UPDATE "User" SET role = ${body.role}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.isActive !== undefined) {
      await sql`UPDATE "User" SET "isActive" = ${body.isActive}, "updatedAt" = NOW() WHERE id = ${id}`
    }

    if (body.password && body.password.trim()) {
      const hashedPassword = await bcrypt.hash(body.password, 10)
      // Only store the bcrypt hash — never store plaintext password
      await sql`UPDATE "User" SET "passwordHash" = ${hashedPassword}, "updatedAt" = NOW() WHERE id = ${id}`
    }

    const updated = await sql`
      SELECT ${sql.unsafe(USER_SAFE_FIELDS)}
      FROM "User" u
      LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
      WHERE u.id = ${id}
    `
    return NextResponse.json({ success: true, data: updated[0] })
  } catch (error) {
    console.error("[users/id] PATCH error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await verifyRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const sql = neon(process.env.DATABASE_URL!)

    const existing = await sql`
      SELECT id, role, name, "franchiseeId" FROM "User" WHERE id = ${id}
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const targetUser = existing[0]
    const canDelete =
      currentUser.role === "super_admin" ||
      (currentUser.role === "uk" && ["uk_employee", "franchisee"].includes(targetUser.role)) ||
      (currentUser.role === "franchisee" &&
        targetUser.franchiseeId === currentUser.franchiseeId &&
        ["admin", "employee", "animator", "host", "dj"].includes(targetUser.role))

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (targetUser.franchiseeId) {
      await sql`DELETE FROM "Personnel" WHERE "franchiseeId" = ${targetUser.franchiseeId} AND name = ${targetUser.name}`
    }

    await sql`DELETE FROM "User" WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[users/id] DELETE error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
