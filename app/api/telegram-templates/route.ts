import { verifyRequest } from "@/lib/simple-auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"

export async function GET(request: Request) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!["franchisee", "admin"].includes(user.role)) {
      return errorResponse("Only franchisee can manage Telegram templates", 403)
    }

    const templates = await prisma.telegramTemplate.findMany({
      where: {
        franchiseeId: user.franchiseeId!,
      },
    })

    return successResponse(templates)
  } catch (error) {
    console.error("[TELEGRAM_TEMPLATES_GET]", error)
    return errorResponse("Failed to fetch templates", 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!["franchisee", "admin"].includes(user.role)) {
      return errorResponse("Only franchisee can manage Telegram templates", 403)
    }

    const body = await request.json()
    const { type, message } = body

    if (!type || !message) {
      return errorResponse("Type and message are required", 400)
    }

    const template = await prisma.telegramTemplate.upsert({
      where: {
        franchiseeId_type: {
          franchiseeId: user.franchiseeId!,
          type,
        },
      },
      update: {
        message,
        isActive: true,
      },
      create: {
        franchiseeId: user.franchiseeId!,
        type,
        message,
        isActive: true,
      },
    })

    return successResponse(template)
  } catch (error) {
    console.error("[TELEGRAM_TEMPLATES_POST]", error)
    return errorResponse("Failed to save template", 500)
  }
}
