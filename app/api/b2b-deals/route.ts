import { verifyRequest } from "@/lib/simple-auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/response"

export async function GET(request: Request) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only UK can view B2B deals
    if (!["super_admin", "uk", "uk_employee"].includes(user.role)) {
      return forbiddenResponse()
    }

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage")

    const where: any = {}
    if (stage) {
      where.stage = stage
    }

    const deals = await prisma.b2BDeal.findMany({
      where,
      include: {
        responsible: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return successResponse(deals)
  } catch (error) {
    console.error("[B2B_DEALS_GET]", error)
    return errorResponse("Failed to fetch B2B deals", 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only UK can create B2B deals
    if (!["super_admin", "uk", "uk_employee"].includes(user.role)) {
      return forbiddenResponse()
    }

    const body = await request.json()

    const deal = await prisma.b2BDeal.create({
      data: {
        ...body,
        responsibleId: user.userId,
      },
      include: {
        responsible: { select: { id: true, name: true } },
      },
    })

    return successResponse(deal, 201)
  } catch (error) {
    console.error("[B2B_DEALS_POST]", error)
    return errorResponse("Failed to create B2B deal", 500)
  }
}
