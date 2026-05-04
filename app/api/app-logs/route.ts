/**
 * API endpoint для Application Logs
 * GET — получить логи (super_admin/uk only)
 * POST — записать лог с клиента
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { getAppLogs, getLogStats, logApp, cleanOldLogs, deleteAppLog, type LogLevel, type LogSource } from "@/lib/app-logger"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "super_admin" && user.role !== "uk") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const sp = request.nextUrl.searchParams
    const action = sp.get("action")

    // Статистика
    if (action === "stats") {
      const days = Number.parseInt(sp.get("days") || "7", 10)
      const stats = await getLogStats(days)
      return NextResponse.json({ success: true, data: stats })
    }

    // Очистка старых логов
    if (action === "clean") {
      const days = Number.parseInt(sp.get("days") || "30", 10)
      const deleted = await cleanOldLogs(days)
      return NextResponse.json({ success: true, deleted })
    }

    // Список логов
    const page = Number.parseInt(sp.get("page") || "1", 10)
    const limit = Math.min(Number.parseInt(sp.get("limit") || "50", 10), 200)
    const level = sp.get("level") as LogLevel | null
    const source = sp.get("source") as LogSource | null
    const search = sp.get("search")
    const dateFrom = sp.get("dateFrom")
    const dateTo = sp.get("dateTo")

    const result = await getAppLogs({
      page,
      limit,
      level: level || undefined,
      source: source || undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
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
    console.error("[AppLogs API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}

// DELETE — удалить одну запись лога (super_admin/uk only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "super_admin" && user.role !== "uk") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    const id = request.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
    const ok = await deleteAppLog(id)
    return NextResponse.json({ success: ok })
  } catch (error) {
    console.error("[AppLogs API] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete log" }, { status: 500 })
  }
}

// POST — записать лог (клиентские ошибки)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    const body = await request.json()

    await logApp({
      level: body.level || "error",
      source: body.source || "client",
      message: body.message || "Unknown error",
      stack: body.stack || null,
      url: body.url || null,
      method: body.method || null,
      statusCode: body.statusCode || null,
      userId: user?.userId || null,
      metadata: body.metadata || null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[AppLogs API] POST error:", error)
    return NextResponse.json({ error: "Failed to write log" }, { status: 500 })
  }
}
