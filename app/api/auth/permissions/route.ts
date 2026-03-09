import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyToken } from "@/lib/simple-auth"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const currentUserId = payload.userId as string
    const currentRole = payload.role as string

    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get("userId")

    // H1: Non-UK roles can only read their own permissions
    if (requestedUserId && requestedUserId !== currentUserId) {
      if (!["uk", "super_admin", "uk_employee"].includes(currentRole)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const userId = requestedUserId || currentUserId

    const sql = neon(process.env.DATABASE_URL!)

    // Get user permissions
    const permissions = await sql`
      SELECT
        "canViewDashboard", "canViewCrm", "canViewErp", "canViewKpi",
        "canViewMessages", "canViewKnowledgeBase", "canViewUsers",
        "canViewAccess", "canViewNotifications",
        "canManageSchedule", "canManagePersonnel"
      FROM "UserPermission"
      WHERE "userId" = ${userId}
    `

    // Get user role
    const userRow = await sql`SELECT role FROM "User" WHERE id = ${userId}`
    const role = userRow[0]?.role

    if (permissions.length === 0) {
      const isUkLevel = role === "uk" || role === "super_admin"
      const isAdmin = role === "admin" || role === "employee"

      const defaultPermissions = {
        canViewDashboard: true,
        canViewCrm: true,
        canViewErp: isUkLevel || (role === "franchisee" || role === "own_point"),
        canViewKpi: isUkLevel,
        canViewMessages: !isAdmin,
        canViewKnowledgeBase: true,
        canViewUsers: isUkLevel ? true : false,
        canViewAccess: isUkLevel,
        canViewNotifications: true,
      }

      return NextResponse.json({ permissions: defaultPermissions })
    }

    const p = permissions[0]

    // For admin role: map canManageSchedule/canManagePersonnel to sidebar-compatible fields
    if (role === "admin" || role === "employee") {
      const mapped = {
        canViewDashboard: p.canViewDashboard ?? true,
        canViewCrm: p.canViewCrm ?? true,
        canViewErp: p.canViewErp ?? false,
        canViewKpi: p.canManageSchedule ?? true, // map schedule permission for sidebar
        canViewMessages: p.canViewMessages ?? false,
        canViewKnowledgeBase: p.canViewKnowledgeBase ?? true,
        canViewUsers: p.canManagePersonnel ?? false,
        canViewAccess: p.canViewAccess ?? false,
        canViewNotifications: p.canViewNotifications ?? true,
      }
      return NextResponse.json({ permissions: mapped })
    }

    return NextResponse.json({ permissions: p })
  } catch (error) {
    console.error("[v0] Error fetching user permissions:")
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 })
  }
}
