import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"

export async function GET(request: Request) {
  try {
    console.log("[v0] Alerts API: GET request started")

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("[v0] Alerts API: Unauthorized - no session")
      return unauthorizedResponse()
    }

    console.log("[v0] Alerts API: User role:", session.user.role)

    // Only UK and admins can view alerts
    if (session.user.role !== "uk" && session.user.role !== "admin") {
      console.log("[v0] Alerts API: Unauthorized - wrong role")
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get("severity")

    console.log("[v0] Alerts API: Fetching alerts with severity:", severity)

    let alerts
    try {
      console.log("[v0] Alerts API: Attempting query with includes")
      alerts = await prisma.alert.findMany({
        where: {
          isArchived: false,
          ...(severity && severity !== "all" ? { severity } : {}),
        },
        include: {
          franchisee: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
          deal: {
            select: {
              id: true,
              title: true,
            },
          },
          comments: {
            include: {
              author: {
                select: {
                  name: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
      console.log("[v0] Alerts API: Successfully fetched", alerts.length, "alerts with includes")
    } catch (includeError) {
      console.error("[v0] Alerts API: Error with includes, trying simple query:", includeError)
      // Fallback to simple query without includes
      alerts = await prisma.alert.findMany({
        where: {
          isArchived: false,
          ...(severity && severity !== "all" ? { severity } : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
      })
      console.log("[v0] Alerts API: Fetched", alerts.length, "alerts without includes")

      // Manually add franchisee data
      const alertsWithData = await Promise.all(
        alerts.map(async (alert: any) => {
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
      alerts = alertsWithData
    }

    console.log("[v0] Alerts API: Returning success response")
    return successResponse({ alerts })
  } catch (error) {
    console.error("[v0] Alerts API: Fatal error:", error)
    return errorResponse("Failed to fetch alerts", 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { location, dealId, message, franchiseeId, severity } = body

    if (!location || !message || !franchiseeId || !severity) {
      return errorResponse("Missing required fields", 400)
    }

    const alert = await prisma.alert.create({
      data: {
        location,
        dealId,
        message,
        franchiseeId,
        severity,
      },
      include: {
        franchisee: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    })

    return successResponse({ alert })
  } catch (error) {
    console.error("[ALERTS_POST]", error)
    return errorResponse("Failed to create alert", 500)
  }
}
