import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const sql = neon(process.env.DATABASE_URL!)

    const users = await sql`
      SELECT u.*, f.name as "franchiseeName"
      FROM "User" u
      LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
      WHERE u.id = ${id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: users[0] })
  } catch (error) {
    console.error("[v0] Error fetching user:", error)
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

    // Check if user exists
    const existing = await sql`SELECT * FROM "User" WHERE id = ${id}`
    if (existing.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check permissions
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

    // Update user fields
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
      await sql`UPDATE "User" SET "passwordHash" = ${hashedPassword}, password = ${hashedPassword}, "updatedAt" = NOW() WHERE id = ${id}`
    }

    const updated = await sql`SELECT * FROM "User" WHERE id = ${id}`
    return NextResponse.json({ success: true, data: updated[0] })
  } catch (error) {
    console.error("[v0] Error updating user:", error)
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

    // Check if user exists
    const existing = await sql`SELECT * FROM "User" WHERE id = ${id}`
    if (existing.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check permissions
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
    console.error("[v0] Error deleting user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
