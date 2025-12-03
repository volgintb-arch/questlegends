import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"

export async function PATCH(request: Request, { params }: { params: { templateId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return unauthorizedResponse()
    }

    if (session.user.role !== "franchisee" && session.user.role !== "admin") {
      return errorResponse("Forbidden", 403)
    }

    const body = await request.json()
    const { isActive } = body

    const template = await prisma.telegramTemplate.update({
      where: {
        id: params.templateId,
        franchiseeId: session.user.franchiseeId!,
      },
      data: {
        isActive,
      },
    })

    return successResponse(template)
  } catch (error) {
    console.error("[TELEGRAM_TEMPLATE_PATCH]", error)
    return errorResponse("Failed to update template", 500)
  }
}
