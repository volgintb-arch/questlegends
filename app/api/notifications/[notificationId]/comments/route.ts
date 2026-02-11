import { verifyRequest } from "@/lib/simple-auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"

export async function POST(request: Request, { params }: { params: { notificationId: string } }) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { text } = body

    if (!text?.trim()) {
      return errorResponse("Comment text is required", 400)
    }

    const comment = await prisma.notificationComment.create({
      data: {
        notificationId: params.notificationId,
        authorId: user.userId,
        text: text.trim(),
      },
      include: {
        author: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    })

    return successResponse({ comment })
  } catch (error) {
    console.error("[NOTIFICATION_COMMENT_POST]", error)
    return errorResponse("Failed to add comment", 500)
  }
}
