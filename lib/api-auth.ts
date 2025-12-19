import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"
import { neon } from "@neondatabase/serverless"
import { checkRateLimit } from "./rate-limit"
import { isValidUUID } from "./auth-utils"

export interface ApiUser {
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

export async function getApiUser(request: Request): Promise<ApiUser | null> {
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

export async function requireApiAuth(request: Request): Promise<{ user: ApiUser } | NextResponse> {
  const user = await getApiUser(request)

  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация", code: "UNAUTHORIZED" }, { status: 401 })
  }

  return { user }
}

export function requireRoles(user: ApiUser, allowedRoles: string[]): NextResponse | null {
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: "Недостаточно прав доступа", code: "FORBIDDEN", requiredRoles: allowedRoles },
      { status: 403 },
    )
  }
  return null
}

export function requireFranchiseeMatch(user: ApiUser, targetFranchiseeId: string): NextResponse | null {
  if (user.role === "super_admin" || user.role === "uk_company" || user.role === "uk") {
    return null
  }

  if (user.franchiseeId !== targetFranchiseeId) {
    return NextResponse.json({ error: "Доступ к данным этого франчайзи запрещен", code: "FORBIDDEN" }, { status: 403 })
  }

  return null
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

    if (permissions.length === 0) {
      return null
    }

    return permissions[0] as UserPermissions
  } catch (error) {
    console.error("[v0] Error fetching permissions:", error)
    return null
  }
}

export async function requirePermission(
  userId: string,
  permissionKey: keyof UserPermissions,
): Promise<NextResponse | null> {
  const permissions = await getUserPermissions(userId)

  if (!permissions) {
    return NextResponse.json({ error: "Права доступа не настроены", code: "NO_PERMISSIONS" }, { status: 403 })
  }

  if (!permissions[permissionKey]) {
    return NextResponse.json(
      { error: "Недостаточно прав для выполнения этого действия", code: "INSUFFICIENT_PERMISSIONS" },
      { status: 403 },
    )
  }

  return null
}

export function validateUUIDs(ids: Record<string, string>): NextResponse | null {
  for (const [key, value] of Object.entries(ids)) {
    if (!isValidUUID(value)) {
      return NextResponse.json({ error: `Неверный формат ID: ${key}`, code: "INVALID_UUID" }, { status: 400 })
    }
  }
  return null
}

export function sanitizeBody<T extends Record<string, any>>(body: T): T {
  const sanitized: any = {}

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") {
      sanitized[key] = value.replace(/[<>]/g, "").trim()
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}

export async function withRateLimit(
  request: Request | NextRequest,
  maxRequests = 100,
  windowMs = 60000,
): Promise<NextResponse | null> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown"

  return checkRateLimit(ip, maxRequests, windowMs)
}

export function createApiError(message: string, code: string, status: number) {
  return NextResponse.json(
    {
      error: message,
      code,
      timestamp: new Date().toISOString(),
    },
    { status },
  )
}

export function createApiSuccess<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  })
}
