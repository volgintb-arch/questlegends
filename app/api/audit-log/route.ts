/**
 * API endpoint для Audit Log
 * Доступ только для uk/super_admin (read-only)
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { getAuditLogs, type AuditAction, type AuditEntityType } from "@/lib/audit-log"

export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации
    const tokenPayload = await verifyRequest(request)
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Только uk/super_admin может просматривать audit log
    if (tokenPayload.role !== "super_admin" && tokenPayload.role !== "uk") {
      return NextResponse.json({ error: "Access denied. Only UK owner can view audit logs." }, { status: 403 })
    }

    // Получение параметров запроса
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50", 10), 100)
    const action = searchParams.get("action") as AuditAction | null
    const entityType = searchParams.get("entityType") as AuditEntityType | null
    const userId = searchParams.get("userId")
    const franchiseeId = searchParams.get("franchiseeId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const result = await getAuditLogs({
      page,
      limit,
      action: action || undefined,
      entityType: entityType || undefined,
      userId: userId || undefined,
      franchiseeId: franchiseeId || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    })

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    })
  } catch (error) {
    console.error("[AuditLog API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
  }
}
