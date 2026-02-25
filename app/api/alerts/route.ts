import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(request: Request) {
  const user = await verifyRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get("severity")

    // Franchisee-scoped access: non-admin roles only see their own franchisee's alerts
    const isGlobalRole = ["uk", "super_admin", "uk_employee"].includes(user.role)

    let alerts
    if (severity && severity !== "all") {
      alerts = isGlobalRole
        ? await sql`
            SELECT
              a.id, a.location, a.message, a.severity, a."franchiseeId", a."dealId",
              a."createdAt", a."updatedAt",
              f.id as franchisee_id, f.name as franchisee_name, f.city as franchisee_city
            FROM "Alert" a
            LEFT JOIN "Franchisee" f ON f.id = a."franchiseeId"
            WHERE a."isArchived" = false AND a.severity = ${severity}
            ORDER BY a."createdAt" DESC
          `
        : await sql`
            SELECT
              a.id, a.location, a.message, a.severity, a."franchiseeId", a."dealId",
              a."createdAt", a."updatedAt",
              f.id as franchisee_id, f.name as franchisee_name, f.city as franchisee_city
            FROM "Alert" a
            LEFT JOIN "Franchisee" f ON f.id = a."franchiseeId"
            WHERE a."isArchived" = false AND a.severity = ${severity}
              AND a."franchiseeId" = ${user.franchiseeId}
            ORDER BY a."createdAt" DESC
          `
    } else {
      alerts = isGlobalRole
        ? await sql`
            SELECT
              a.id, a.location, a.message, a.severity, a."franchiseeId", a."dealId",
              a."createdAt", a."updatedAt",
              f.id as franchisee_id, f.name as franchisee_name, f.city as franchisee_city
            FROM "Alert" a
            LEFT JOIN "Franchisee" f ON f.id = a."franchiseeId"
            WHERE a."isArchived" = false
            ORDER BY a."createdAt" DESC
          `
        : await sql`
            SELECT
              a.id, a.location, a.message, a.severity, a."franchiseeId", a."dealId",
              a."createdAt", a."updatedAt",
              f.id as franchisee_id, f.name as franchisee_name, f.city as franchisee_city
            FROM "Alert" a
            LEFT JOIN "Franchisee" f ON f.id = a."franchiseeId"
            WHERE a."isArchived" = false AND a."franchiseeId" = ${user.franchiseeId}
            ORDER BY a."createdAt" DESC
          `
    }

    const alertsWithData = alerts.map((alert: any) => ({
      id: alert.id,
      location: alert.location,
      message: alert.message,
      severity: alert.severity,
      franchiseeId: alert.franchiseeid,
      dealId: alert.dealid,
      createdAt: alert.createdat,
      updatedAt: alert.updatedat,
      franchisee: alert.franchisee_id
        ? {
            id: alert.franchisee_id,
            name: alert.franchisee_name || "Unknown",
            city: alert.franchisee_city || "Unknown",
          }
        : null,
      deal: null,
      comments: [],
    }))

    return NextResponse.json({ success: true, data: { alerts: alertsWithData } })
  } catch (error) {
    console.error("[alerts] GET error")
    return NextResponse.json(
      { success: false, error: "Failed to fetch alerts" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const user = await verifyRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  // Only managers and above can create alerts
  const allowedRoles = ["uk", "super_admin", "uk_employee", "franchisee", "own_point", "admin"]
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)

    const body = await request.json()
    const { location, dealId, message, franchiseeId, severity } = body

    if (!location || !message || !franchiseeId || !severity) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Validate severity enum
    if (!["critical", "warning"].includes(severity)) {
      return NextResponse.json({ success: false, error: "Invalid severity value" }, { status: 400 })
    }

    // Non-admin users can only create alerts for their own franchisee
    const isGlobalRole = ["uk", "super_admin", "uk_employee"].includes(user.role)
    if (!isGlobalRole && franchiseeId !== user.franchiseeId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const result = await sql`
      INSERT INTO "Alert" (location, "dealId", message, "franchiseeId", severity, "createdAt", "updatedAt", "isArchived")
      VALUES (${location}, ${dealId || null}, ${message}, ${franchiseeId}, ${severity}, NOW(), NOW(), false)
      RETURNING id, location, "dealId", message, "franchiseeId", severity, "createdAt", "updatedAt"
    `

    return NextResponse.json({ success: true, data: { alert: result[0] } })
  } catch (error) {
    console.error("[alerts] POST error")
    return NextResponse.json({ success: false, error: "Failed to create alert" }, { status: 500 })
  }
}
