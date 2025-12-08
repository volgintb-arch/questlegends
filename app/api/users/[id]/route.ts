import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.userId as string,
      role: payload.role as string,
      franchiseeId: payload.franchiseeId as string | null,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
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

    // Update user
    const updates: string[] = []
    const values: any[] = []

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

    const updated = await sql`SELECT * FROM "User" WHERE id = ${id}`
    return NextResponse.json({ success: true, data: updated[0] })
  } catch (error) {
    console.error("[v0] Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
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

    await sql`DELETE FROM "User" WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
