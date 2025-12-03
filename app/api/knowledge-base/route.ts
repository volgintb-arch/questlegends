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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return unauthorizedResponse()
    }

    // Only UK can create articles
    if (session.user.role !== "UK") {
      return forbiddenResponse()
    }

    const body = await request.json()

    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        ...body,
        authorId: session.user.id,
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
