import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")

  try {
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

export async function GET(request: Request) {
  try {
    console.log("[v0] Permissions API: GET request started")

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      console.log("[v0] Permissions API: Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    let users
    if (franchiseeId) {
      users = await sql`
        SELECT u.id, u.name, u.phone, u.role, u.telegram, u."isActive", u.description,
               up."canViewDashboard", up."canViewDeals", up."canViewFinances", 
               up."canManageConstants", up."canViewNotifications"
        FROM "User" u
        LEFT JOIN "UserPermission" up ON u.id = up."userId"
        WHERE u."franchiseeId" = ${franchiseeId}
          AND u.role IN ('admin', 'employee', 'animator', 'host', 'dj')
          AND u."isActive" = true
        ORDER BY u."createdAt" DESC
      `
    } else {
      // For UK - get UK employees only
      users = await sql`
        SELECT u.id, u.name, u.phone, u.role, u.telegram, u."isActive", u.description,
               up."canViewDashboard", up."canViewDeals", up."canViewFinances", 
               up."canManageConstants", up."canViewNotifications"
        FROM "User" u
        LEFT JOIN "UserPermission" up ON u.id = up."userId"
        WHERE u.role IN ('uk', 'uk_employee')
          AND u."isActive" = true
        ORDER BY u."createdAt" DESC
      `
    }

    const formattedUsers = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      telegram: u.telegram,
      isActive: u.isActive,
      description: u.description,
      userPermissions: {
        canViewDashboard: u.canViewDashboard ?? true,
        canViewDeals: u.canViewDeals ?? false,
        canViewFinances: u.canViewFinances ?? false,
        canManageConstants: u.canManageConstants ?? false,
        canViewNotifications: u.canViewNotifications ?? true,
      },
    }))

    console.log("[v0] Permissions API: Found", formattedUsers.length, "users")
    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error("[v0] Error fetching permissions:", error)
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    console.log("[v0] Permissions API: PUT request started")

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, permissions } = body

    if (!userId || !permissions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check if permission exists
    const existing = await sql`SELECT id FROM "UserPermission" WHERE "userId" = ${userId}`

    if (existing.length > 0) {
      await sql`
        UPDATE "UserPermission" SET
          "canViewDashboard" = ${permissions.canViewDashboard ?? true},
          "canViewDeals" = ${permissions.canViewDeals ?? false},
          "canViewFinances" = ${permissions.canViewFinances ?? false},
          "canManageConstants" = ${permissions.canManageConstants ?? false},
          "canViewNotifications" = ${permissions.canViewNotifications ?? true},
          "updatedAt" = NOW()
        WHERE "userId" = ${userId}
      `
    } else {
      await sql`
        INSERT INTO "UserPermission" (id, "userId", "canViewDashboard", "canViewDeals", "canViewFinances", "canManageConstants", "canViewNotifications", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::text,
          ${userId},
          ${permissions.canViewDashboard ?? true},
          ${permissions.canViewDeals ?? false},
          ${permissions.canViewFinances ?? false},
          ${permissions.canManageConstants ?? false},
          ${permissions.canViewNotifications ?? true},
          NOW(),
          NOW()
        )
      `
    }

    console.log("[v0] Permissions API: Updated permissions for user", userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating permissions:", error)
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 })
  }
}
