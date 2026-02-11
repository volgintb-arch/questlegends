import { verifyRequest } from "@/lib/simple-auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/response"

export async function GET(request: Request) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    const where: any = {}
    if (category) {
      where.category = category
    }

    const articles = await prisma.knowledgeBaseArticle.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return successResponse(articles)
  } catch (error) {
    console.error("[KB_GET]", error)
    return errorResponse("Failed to fetch articles", 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only UK can create articles
    if (!["super_admin", "uk", "uk_employee"].includes(user.role)) {
      return forbiddenResponse()
    }

    const body = await request.json()

    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        ...body,
        authorId: user.userId,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    })

    return successResponse(article, 201)
  } catch (error) {
    console.error("[KB_POST]", error)
    return errorResponse("Failed to create article", 500)
  }
}
