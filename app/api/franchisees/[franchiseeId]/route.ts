import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@/lib/utils/response"
import { canAccessResource } from "@/lib/utils/permissions"

export async function GET(request: Request, { params }: { params: { franchiseeId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return unauthorizedResponse()
    }

    const franchisee = await prisma.franchisee.findUnique({
      where: { id: params.franchiseeId },
      include: {
        _count: {
          select: {
            deals: true,
            transactions: true,
            expenses: true,
            personnel: true,
            users: true,
          },
        },
      },
    })

    if (!franchisee) {
      return notFoundResponse("Franchisee")
    }

    // Check access rights
    if (!canAccessResource(session.user.role, session.user.franchiseeId, franchisee.id)) {
      return forbiddenResponse()
    }

    return successResponse(franchisee)
  } catch (error) {
    console.error("[FRANCHISEE_GET]", error)
    return errorResponse("Failed to fetch franchisee", 500)
  }
}

export async function PATCH(request: Request, { params }: { params: { franchiseeId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return unauthorizedResponse()
    }

    // Only UK can update franchisees
    if (session.user.role !== "UK") {
      return forbiddenResponse()
    }

    const body = await request.json()

    const franchisee = await prisma.franchisee.update({
      where: { id: params.franchiseeId },
      data: body,
    })

    return successResponse(franchisee)
  } catch (error) {
    console.error("[FRANCHISEE_PATCH]", error)
    return errorResponse("Failed to update franchisee", 500)
  }
}
