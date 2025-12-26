import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/simple-auth"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const currentUserId = payload.userId as string
    const currentRole = payload.role as string

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || currentUserId

    const sql = neon(process.env.DATABASE_URL!)

    // Get user permissions
    const permissions = await sql`
      SELECT 
        "canViewDashboard", "canViewCrm", "canViewErp", "canViewKpi",
        "canViewMessages", "canViewKnowledgeBase", "canViewUsers",
        "canViewAccess", "canViewNotifications"
      FROM "UserPermission"
      WHERE "userId" = ${userId}
    `

    if (permissions.length === 0) {
      // Return default permissions based on role
      const user = await sql`SELECT role FROM "User" WHERE id = ${userId}`
      const role = user[0]?.role

      // Default permissions: UK has full access, UK employee has limited
      const defaultPermissions = {
        canViewDashboard: true,
        canViewCrm: true,
        canViewErp: role === "uk" || role === "super_admin",
        canViewKpi: role === "uk" || role === "super_admin",
        canViewMessages: true,
        canViewKnowledgeBase: true,
        canViewUsers: role === "uk" || role === "super_admin",
        canViewAccess: role === "uk" || role === "super_admin",
        canViewNotifications: true,
      }

      return NextResponse.json({ permissions: defaultPermissions })
    }

    return NextResponse.json({ permissions: permissions[0] })
  } catch (error) {
    console.error("[v0] Error fetching user permissions:", error)
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 })
  }
}
