import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest, createSignedToken } from "@/lib/simple-auth"
import { sql } from "@/lib/db"

// POST — вход как другой пользователь (для super_admin или uk)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user || (user.role !== "super_admin" && user.role !== "uk")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get target user from database
    const targetUsers = await sql`
      SELECT u.id, u.name, u.phone, u.role, u."franchiseeId", u."isActive"
      FROM "User" u
      WHERE u.id = ${userId} AND u."isActive" = true
    `

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 404 })
    }

    const targetUser = targetUsers[0]

    // Only allow viewing franchisee, own_point, or admin users
    if (!["franchisee", "own_point", "admin"].includes(targetUser.role)) {
      return NextResponse.json({ error: "Cannot view this user" }, { status: 403 })
    }

    // Generate viewing token
    const token = await createSignedToken({
      userId: targetUser.id,
      phone: targetUser.phone || "hidden",
      name: targetUser.name,
      role: targetUser.role,
      franchiseeId: targetUser.franchiseeId,
    })

    return NextResponse.json({ token })
  } catch (error) {
    console.error("[auth] View-as error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
