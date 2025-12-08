import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

const sql = neon(process.env.DATABASE_URL!)

async function getCurrentUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)

    return {
      id: payload.userId as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser(request)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const articles = await sql`
      SELECT 
        id, title, content, category, "authorId", "createdAt", "updatedAt"
      FROM "KnowledgeArticle"
      WHERE id = ${id}
    `

    if (articles.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    return NextResponse.json(articles[0])
  } catch (error) {
    console.error("[v0] Knowledge article GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log("[v0] Knowledge API DELETE: Deleting article", id)

    const currentUser = await getCurrentUser(request)

    if (!currentUser) {
      console.log("[v0] Knowledge API DELETE: Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Knowledge API DELETE: User", currentUser.id, "role", currentUser.role)

    // Check if article exists
    const articles = await sql`
      SELECT id, "authorId" FROM "KnowledgeArticle" WHERE id = ${id}
    `

    if (articles.length === 0) {
      console.log("[v0] Knowledge API DELETE: Article not found")
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    const article = articles[0]

    // Check permissions - author or admin roles can delete
    const canDelete = article.authorId === currentUser.id || ["super_admin", "uk", "admin"].includes(currentUser.role)

    if (!canDelete) {
      console.log("[v0] Knowledge API DELETE: Forbidden")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete the article
    await sql`DELETE FROM "KnowledgeArticle" WHERE id = ${id}`

    console.log("[v0] Knowledge API DELETE: Article deleted successfully")
    return NextResponse.json({ success: true, message: "Article deleted successfully" })
  } catch (error) {
    console.error("[v0] Knowledge article DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser(request)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, category } = body

    // Check if article exists
    const articles = await sql`
      SELECT id, "authorId" FROM "KnowledgeArticle" WHERE id = ${id}
    `

    if (articles.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    const article = articles[0]

    // Check permissions
    const canEdit = article.authorId === currentUser.id || ["super_admin", "uk", "admin"].includes(currentUser.role)

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update the article
    await sql`
      UPDATE "KnowledgeArticle"
      SET 
        title = ${title},
        content = ${content},
        category = ${category},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true, message: "Article updated successfully" })
  } catch (error) {
    console.error("[v0] Knowledge article PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
