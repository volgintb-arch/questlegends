import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/simple-auth"

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const payload = verifyToken(token)
    if (!payload) return null

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
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    let users

    if (currentUser.role === "super_admin" || currentUser.role === "uk" || currentUser.role === "uk_employee") {
      if (franchiseeId) {
        users = await sql`
          SELECT u.id, u.name, u.phone, u.role, u.telegram, u."isActive", u.description,
                 u."franchiseeId",
                 up."canViewDashboard", up."canViewCrm", up."canViewErp", up."canViewKpi",
                 up."canViewMessages", up."canViewKnowledgeBase", up."canViewUsers",
                 up."canViewAccess", up."canViewNotifications",
                 up."canManageSchedule", up."canManagePersonnel", up."canManageUsers",
                 f.name as "franchiseeName"
          FROM "User" u
          LEFT JOIN "UserPermission" up ON u.id = up."userId"
          LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
          WHERE u."franchiseeId" = ${franchiseeId}
            AND u.role IN ('admin', 'employee', 'animator', 'host', 'dj')
            AND u."isActive" = true
          ORDER BY u."createdAt" DESC
        `
      } else {
        users = await sql`
          SELECT u.id, u.name, u.phone, u.role, u.telegram, u."isActive", u.description,
                 u."franchiseeId",
                 up."canViewDashboard", up."canViewCrm", up."canViewErp", up."canViewKpi",
                 up."canViewMessages", up."canViewKnowledgeBase", up."canViewUsers",
                 up."canViewAccess", up."canViewNotifications",
                 up."canManageSchedule", up."canManagePersonnel", up."canManageUsers",
                 f.name as "franchiseeName",
                 ARRAY(SELECT ufa."franchiseeId" FROM "UserFranchiseeAssignment" ufa WHERE ufa."userId" = u.id) as "assignedFranchisees"
          FROM "User" u
          LEFT JOIN "UserPermission" up ON u.id = up."userId"
          LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
          WHERE u.role IN ('uk', 'uk_employee')
            AND u."isActive" = true
            AND u.id != ${currentUser.id}
          ORDER BY 
            CASE u.role 
              WHEN 'uk' THEN 1 
              WHEN 'uk_employee' THEN 2 
            END,
            u."createdAt" DESC
        `
      }
    } else if (currentUser.role === "franchisee" || currentUser.role === "own_point" || currentUser.role === "admin") {
      const fId = currentUser.franchiseeId
      if (!fId) {
        return NextResponse.json({ users: [] })
      }

      users = await sql`
        SELECT u.id, u.name, u.phone, u.role, u.telegram, u."isActive", u.description,
               u."franchiseeId",
               up."canViewDashboard", up."canViewCrm", up."canViewErp", up."canViewKpi",
               up."canViewMessages", up."canViewKnowledgeBase", up."canViewUsers",
               up."canViewAccess", up."canViewNotifications",
               up."canManageSchedule", up."canManagePersonnel", up."canManageUsers",
               f.name as "franchiseeName"
        FROM "User" u
        LEFT JOIN "UserPermission" up ON u.id = up."userId"
        LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
        WHERE u."franchiseeId" = ${fId}
          AND u.role IN ('admin', 'employee', 'animator', 'host', 'dj')
          AND u."isActive" = true
        ORDER BY u."createdAt" DESC
      `
    } else {
      return NextResponse.json({ users: [] })
    }

    const formattedUsers = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      telegram: u.telegram,
      isActive: u.isActive,
      description: u.description,
      franchiseeId: u.franchiseeId,
      franchiseeName: u.franchiseeName,
      assignedFranchisees: u.assignedFranchisees || [],
      userPermissions: {
        canViewDashboard: u.canViewDashboard ?? true,
        canViewCrm: u.canViewCrm ?? true,
        canViewErp: u.canViewErp ?? true,
        canViewKpi: u.canViewKpi ?? true,
        canViewMessages: u.canViewMessages ?? true,
        canViewKnowledgeBase: u.canViewKnowledgeBase ?? true,
        canViewUsers: u.canViewUsers ?? false,
        canViewAccess: u.canViewAccess ?? false,
        canViewNotifications: u.canViewNotifications ?? true,
        canManageSchedule: u.canManageSchedule ?? true,
        canManagePersonnel: u.canManagePersonnel ?? false,
        canManageUsers: u.canManageUsers ?? false,
      },
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error("[v0] Error fetching permissions:", error)
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canManagePermissions =
      currentUser.role === "super_admin" ||
      currentUser.role === "uk" ||
      currentUser.role === "franchisee" ||
      currentUser.role === "own_point"

    if (!canManagePermissions) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, permissions, assignedFranchisees } = body

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    if (currentUser.role === "franchisee" || currentUser.role === "own_point") {
      const targetUser = await sql`
        SELECT "franchiseeId" FROM "User" WHERE id = ${userId}
      `

      if (targetUser.length === 0 || targetUser[0].franchiseeId !== currentUser.franchiseeId) {
        return NextResponse.json({ error: "You can only manage users from your own location" }, { status: 403 })
      }
    }

    if (permissions) {
      const existing = await sql`SELECT id FROM "UserPermission" WHERE "userId" = ${userId}`

      if (existing.length > 0) {
        const updates: any = {}
        if (permissions.canViewDashboard !== undefined) updates.canViewDashboard = permissions.canViewDashboard
        if (permissions.canViewCrm !== undefined) updates.canViewCrm = permissions.canViewCrm
        if (permissions.canViewErp !== undefined) updates.canViewErp = permissions.canViewErp
        if (permissions.canViewMessages !== undefined) updates.canViewMessages = permissions.canViewMessages
        if (permissions.canViewKnowledgeBase !== undefined)
          updates.canViewKnowledgeBase = permissions.canViewKnowledgeBase
        if (permissions.canViewUsers !== undefined) updates.canViewUsers = permissions.canViewUsers
        if (permissions.canViewAccess !== undefined) updates.canViewAccess = permissions.canViewAccess
        if (permissions.canViewNotifications !== undefined)
          updates.canViewNotifications = permissions.canViewNotifications
        if (permissions.canManageSchedule !== undefined) updates.canManageSchedule = permissions.canManageSchedule
        if (permissions.canManagePersonnel !== undefined) updates.canManagePersonnel = permissions.canManagePersonnel
        if (permissions.canManageUsers !== undefined) updates.canManageUsers = permissions.canManageUsers

        if (Object.keys(updates).length > 0) {
          await sql`
            UPDATE "UserPermission"
            SET 
              "canViewDashboard" = COALESCE(${updates.canViewDashboard}, "canViewDashboard"),
              "canViewCrm" = COALESCE(${updates.canViewCrm}, "canViewCrm"),
              "canViewErp" = COALESCE(${updates.canViewErp}, "canViewErp"),
              "canViewMessages" = COALESCE(${updates.canViewMessages}, "canViewMessages"),
              "canViewKnowledgeBase" = COALESCE(${updates.canViewKnowledgeBase}, "canViewKnowledgeBase"),
              "canViewUsers" = COALESCE(${updates.canViewUsers}, "canViewUsers"),
              "canViewAccess" = COALESCE(${updates.canViewAccess}, "canViewAccess"),
              "canViewNotifications" = COALESCE(${updates.canViewNotifications}, "canViewNotifications"),
              "canManageSchedule" = COALESCE(${updates.canManageSchedule}, "canManageSchedule"),
              "canManagePersonnel" = COALESCE(${updates.canManagePersonnel}, "canManagePersonnel"),
              "canManageUsers" = COALESCE(${updates.canManageUsers}, "canManageUsers"),
              "updatedAt" = NOW()
            WHERE "userId" = ${userId}
          `
        }
      } else {
        await sql`
          INSERT INTO "UserPermission" (
            id, "userId", "canViewDashboard", "canViewCrm", "canViewErp",
            "canViewMessages", "canViewKnowledgeBase", "canViewUsers", "canViewAccess",
            "canViewNotifications", "canManageSchedule", "canManagePersonnel", "canManageUsers",
            "createdAt", "updatedAt"
          )
          VALUES (
            gen_random_uuid()::text,
            ${userId},
            ${permissions.canViewDashboard ?? true},
            ${permissions.canViewCrm ?? true},
            ${permissions.canViewErp ?? true},
            ${permissions.canViewMessages ?? true},
            ${permissions.canViewKnowledgeBase ?? true},
            ${permissions.canViewUsers ?? false},
            ${permissions.canViewAccess ?? false},
            ${permissions.canViewNotifications ?? true},
            ${permissions.canManageSchedule ?? true},
            ${permissions.canManagePersonnel ?? false},
            ${permissions.canManageUsers ?? false},
            NOW(),
            NOW()
          )
        `
      }
    }

    if (assignedFranchisees !== undefined && (currentUser.role === "super_admin" || currentUser.role === "uk")) {
      await sql`DELETE FROM "UserFranchiseeAssignment" WHERE "userId" = ${userId}`

      if (assignedFranchisees.length > 0) {
        for (const franchiseeId of assignedFranchisees) {
          await sql`
            INSERT INTO "UserFranchiseeAssignment" (id, "userId", "franchiseeId", "createdAt")
            VALUES (gen_random_uuid()::text, ${userId}, ${franchiseeId}, NOW())
          `
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating permissions:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update permissions",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
