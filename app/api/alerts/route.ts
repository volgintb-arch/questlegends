import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    console.log("[v0] Alerts API: GET request started")

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get("severity")

    console.log("[v0] Alerts API: Fetching alerts with severity:", severity)

    const alerts = await prisma.alert.findMany({
      where: {
        isArchived: false,
        ...(severity && severity !== "all" ? { severity } : {}),
      },
      select: {
        id: true,
        location: true,
        message: true,
        severity: true,
        franchiseeId: true,
        dealId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log("[v0] Alerts API: Successfully fetched", alerts.length, "alerts")

    const alertsWithData = await Promise.all(
      alerts.map(async (alert) => {
        try {
          const franchisee = await prisma.franchisee.findUnique({
            where: { id: alert.franchiseeId },
            select: { id: true, name: true, city: true },
          })
          return {
            ...alert,
            franchisee: franchisee || { id: alert.franchiseeId, name: "Unknown", city: "Unknown" },
            deal: null,
            comments: [],
          }
        } catch (e) {
          console.error("[v0] Error fetching franchisee:", e)
          return {
            ...alert,
            franchisee: { id: alert.franchiseeId, name: "Unknown", city: "Unknown" },
            deal: null,
            comments: [],
          }
        }
      }),
    )

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
    const body = await request.json()
    const { location, dealId, message, franchiseeId, severity } = body

    if (!location || !message || !franchiseeId || !severity) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const alert = await prisma.alert.create({
      data: {
        location,
        dealId,
        message,
        franchiseeId,
        severity,
      },
    })

    return NextResponse.json({ success: true, data: { alert } })
  } catch (error) {
    console.error("[v0] Alerts API POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to create alert" }, { status: 500 })
  }
}
