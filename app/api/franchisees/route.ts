import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/response"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return unauthorizedResponse()
    }

    // Only UK can view all franchisees
    if (session.user.role !== "UK") {
      return forbiddenResponse()
    }

    const franchisees = await prisma.franchisee.findMany({
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
      orderBy: { name: "asc" },
    })

    return successResponse(franchisees)
  } catch (error) {
    console.error("[FRANCHISEES_GET]", error)
    return errorResponse("Failed to fetch franchisees", 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return unauthorizedResponse()
    }

    // Only UK can create franchisees
    if (session.user.role !== "UK") {
      return forbiddenResponse()
    }

    const body = await request.json()

    const franchisee = await prisma.franchisee.create({
      data: {
        name: body.name,
        city: body.city,
        address: body.address,
        phone: body.phone,
        email: body.email,
      },
    })

    return successResponse(franchisee, 201)
  } catch (error) {
    console.error("[FRANCHISEES_POST]", error)
    return errorResponse("Failed to create franchisee", 500)
  }
}
