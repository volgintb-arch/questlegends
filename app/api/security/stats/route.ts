import { NextResponse } from "next/server"
import { requireApiAuth, requireRoles } from "@/lib/api-auth"
import { getSecurityStats } from "@/lib/security-monitor"

export async function GET(request: Request) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  const rolesError = requireRoles(user, ["super_admin"])
  if (rolesError) return rolesError

  const stats = getSecurityStats()

  return NextResponse.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  })
}
