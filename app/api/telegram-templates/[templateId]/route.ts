import { verifyRequest } from "@/lib/simple-auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"

export async function PATCH(request: Request, { params }: { params: { templateId: string } }) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!["franchisee", "admin"].includes(user.role)) {
      return errorResponse("Forbidden", 403)
    }

    const body = await request.json()
    const { isActive } = body

    const template = await prisma.telegramTemplate.update({
      where: {
        id: params.templateId,
        franchiseeId: user.franchiseeId!,
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
