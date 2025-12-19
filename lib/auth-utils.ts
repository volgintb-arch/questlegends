import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export interface AuthUser {
  id: string
  name: string
  phone: string
  role: string
  franchiseeId: string | null
}

export interface UserPermissions {
  canViewDashboard: boolean
  canViewCrm: boolean
  canViewErp: boolean
  canViewUsers: boolean
  canViewAccess: boolean
  canViewKnowledge: boolean
  canViewMessages: boolean
  canViewNotifications: boolean
  canManageSchedule: boolean
  canManagePersonnel: boolean
  canManageUsers: boolean
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    name: session.user.name || "",
    phone: session.user.phone || "",
    role: session.user.role || "",
    franchiseeId: session.user.franchiseeId || null,
  }
}

export async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    const permissions = await sql`
      SELECT 
        "canViewDashboard",
        "canViewCrm",
        "canViewErp",
        "canViewUsers",
        "canViewAccess",
        "canViewKnowledge",
        "canViewMessages",
        "canViewNotifications",
        "canManageSchedule",
        "canManagePersonnel",
        "canManageUsers"
      FROM "UserPermission"
      WHERE "userId" = ${userId}
      LIMIT 1
    `

    return permissions[0] || null
  } catch (error) {
    console.error("[v0] Error fetching permissions:", error)
    return null
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 })
  }

  return user
}

export function requireRole(user: AuthUser, allowedRoles: string[]): NextResponse | null {
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Недостаточно прав доступа" }, { status: 403 })
  }
  return null
}

export function requireFranchiseeAccess(user: AuthUser, franchiseeId: string): NextResponse | null {
  // Супер-админ и УК имеют доступ ко всем франшизам
  if (user.role === "super_admin" || user.role === "uk_company") {
    return null
  }

  // Франчайзи и админ могут видеть только свою франшизу
  if (user.franchiseeId !== franchiseeId) {
    return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 })
  }

  return null
}

export async function canUserView(userId: string, resource: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId)

  if (!permissions) {
    return false
  }

  const permissionMap: Record<string, keyof UserPermissions> = {
    dashboard: "canViewDashboard",
    crm: "canViewCrm",
    erp: "canViewErp",
    users: "canViewUsers",
    access: "canViewAccess",
    knowledge: "canViewKnowledge",
    messages: "canViewMessages",
    notifications: "canViewNotifications",
  }

  const permissionKey = permissionMap[resource]
  return permissionKey ? permissions[permissionKey] : false
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, "").trim()
}

export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}
