import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"

export async function PATCH(request: Request, { params }: { params: { notificationId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { isRead, isArchived } = body

    const notification = await prisma.notification.update({
      where: {
        id: params.notificationId,
        recipientId: session.user.id,
      },
      data: {
        ...(typeof isRead === "boolean" ? { isRead } : {}),
        ...(typeof isArchived === "boolean" ? { isArchived } : {}),
      },
    })

    return successResponse({ notification })
  } catch (error) {
    console.error("[NOTIFICATION_PATCH]", error)
    return errorResponse("Failed to update notification", 500)
  }
}

export async function DELETE(request: Request, { params }: { params: { notificationId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    await prisma.notification.delete({
      where: {
        id: params.notificationId,
        recipientId: session.user.id,
      },
    })

    return successResponse({ message: "Notification deleted" })
  } catch (error) {
    console.error("[NOTIFICATION_DELETE]", error)
    return errorResponse("Failed to delete notification", 500)
  }
}
