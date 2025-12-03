import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    // Only UK and admins can view alerts
    if (session.user.role !== "uk" && session.user.role !== "admin") {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get("severity")

    const alerts = await prisma.alert
      .findMany({
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
      .catch((error) => {
        console.error("[ALERTS_QUERY_ERROR]", error)
        // If query fails, try without includes
        return prisma.alert.findMany({
          where: {
            isArchived: false,
            ...(severity && severity !== "all" ? { severity } : {}),
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      })

    return successResponse({ alerts })
  } catch (error) {
    console.error("[ALERTS_GET]", error)
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
