import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { articleId: string } }) {
  try {
    const { articleId } = params

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: articleId },
      include: {
        files: true,
      },
    })

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Increment views
    await prisma.knowledgeArticle.update({
      where: { id: articleId },
      data: { views: { increment: 1 } },
    })

    return NextResponse.json({ article })
  } catch (error: any) {
    console.error("[v0] Knowledge article fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { articleId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { articleId } = params
    const body = await request.json()
    const { title, category, content, type, tags, files } = body

    const article = await prisma.knowledgeArticle.update({
      where: { id: articleId },
      data: {
        title,
        category,
        content,
        type,
        tags,
        updatedAt: new Date(),
        // Delete existing files and create new ones if provided
        ...(files && {
          files: {
            deleteMany: {},
            create: files.map((file: any) => ({
              id: file.id || `FILE-${Date.now()}-${Math.random()}`,
              name: file.name,
              url: file.url,
              size: file.size,
            })),
          },
        }),
      },
      include: {
        files: true,
      },
    })

    return NextResponse.json({ article })
  } catch (error: any) {
    console.error("[v0] Knowledge article update error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { articleId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { articleId } = params

    await prisma.knowledgeArticle.delete({
      where: { id: articleId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Knowledge article deletion error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
