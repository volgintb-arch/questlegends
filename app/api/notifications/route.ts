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

    const { searchParams } = new URL(request.url)
    const filterType = searchParams.get("type")
    const filterRead = searchParams.get("read")

    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: session.user.id,
        isArchived: false,
        ...(filterType && filterType !== "all" ? { type: filterType as any } : {}),
        ...(filterRead === "read" ? { isRead: true } : filterRead === "unread" ? { isRead: false } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
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

    return successResponse({ notifications })
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error)
    return errorResponse("Failed to fetch notifications", 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { type, title, message, recipientId, location, dealId } = body

    if (!type || !title || !message || !recipientId) {
      return errorResponse("Missing required fields", 400)
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        location,
        dealId,
        senderId: session.user.id,
        recipientId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    return successResponse({ notification })
  } catch (error) {
    console.error("[NOTIFICATIONS_POST]", error)
    return errorResponse("Failed to create notification", 500)
  }
}
