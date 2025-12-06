import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request) {
  try {
    console.log("[v0] Alerts API: GET request started")

    if (!process.env.DATABASE_URL) {
      console.error("[v0] Alerts API: DATABASE_URL is not set")
      return NextResponse.json({ success: false, error: "Database configuration error" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get("severity")

    console.log("[v0] Alerts API: Fetching alerts with severity:", severity)

    let alerts
    if (severity && severity !== "all") {
      alerts = await sql`
        SELECT 
          a.id, a.location, a.message, a.severity, a."franchiseeId", a."dealId", 
          a."createdAt", a."updatedAt",
          f.id as franchisee_id, f.name as franchisee_name, f.city as franchisee_city
        FROM "Alert" a
        LEFT JOIN "Franchisee" f ON f.id = a."franchiseeId"
        WHERE a."isArchived" = false AND a.severity = ${severity}
        ORDER BY a."createdAt" DESC
      `
    } else {
      alerts = await sql`
        SELECT 
          a.id, a.location, a.message, a.severity, a."franchiseeId", a."dealId", 
          a."createdAt", a."updatedAt",
          f.id as franchisee_id, f.name as franchisee_name, f.city as franchisee_city
        FROM "Alert" a
        LEFT JOIN "Franchisee" f ON f.id = a."franchiseeId"
        WHERE a."isArchived" = false
        ORDER BY a."createdAt" DESC
      `
    }

    console.log("[v0] Alerts API: Successfully fetched", alerts.length, "alerts")

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

    console.log("[v0] Alerts API: Returning response with", alertsWithData.length, "alerts")

    return NextResponse.json({ success: true, data: { alerts: alertsWithData } })
  } catch (error) {
    console.error("[v0] Alerts API: Fatal error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch alerts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, error: "Database configuration error" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    const body = await request.json()
    const { location, dealId, message, franchiseeId, severity } = body

    if (!location || !message || !franchiseeId || !severity) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO "Alert" (location, "dealId", message, "franchiseeId", severity, "createdAt", "updatedAt", "isArchived")
      VALUES (${location}, ${dealId}, ${message}, ${franchiseeId}, ${severity}, NOW(), NOW(), false)
      RETURNING id, location, "dealId", message, "franchiseeId", severity, "createdAt", "updatedAt"
    `

    return NextResponse.json({ success: true, data: { alert: result[0] } })
  } catch (error) {
    console.error("[v0] Alerts API POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to create alert" }, { status: 500 })
  }
}
