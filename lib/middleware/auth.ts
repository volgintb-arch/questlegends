import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return session
}

export async function requireRole(req: NextRequest, allowedRoles: string[]) {
  const session = await requireAuth(req)

  if (session instanceof NextResponse) {
    return session
  }

  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
  }

  return session
}

export function canAccessFranchisee(userRole: string, userFranchiseeId: string | null, targetFranchiseeId: string) {
  // Roles are stored in lowercase in the database
  if (userRole === "uk" || userRole === "super_admin") return true
  if ((userRole === "franchisee" || userRole === "own_point") && userFranchiseeId === targetFranchiseeId) return true
  if (userRole === "admin" && userFranchiseeId === targetFranchiseeId) return true
  return false
}
