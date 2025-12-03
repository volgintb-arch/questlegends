import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    const where: any = {}

    if (category && category !== "all") {
      where.category = category
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ]
    }

    const articles = await prisma.knowledgeArticle.findMany({
      where,
      include: {
        files: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ articles })
  } catch (error: any) {
    console.error("[v0] Knowledge articles fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, category, content, type, tags, files } = body

    if (!title || !category || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const article = await prisma.knowledgeArticle.create({
      data: {
        id: `KB-${Date.now()}`,
        title,
        category,
        content,
        author: session.user.name || "Unknown",
        authorId: session.user.id,
        type: type || "article",
        tags: tags || [],
        files:
          files && files.length > 0
            ? {
                create: files.map((file: any) => ({
                  id: file.id || `FILE-${Date.now()}-${Math.random()}`,
                  name: file.name,
                  url: file.url,
                  size: file.size,
                })),
              }
            : undefined,
      },
      include: {
        files: true,
      },
    })

    return NextResponse.json({ article }, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Knowledge article creation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
