import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const currentUser = await verifyRequest(request)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    const articles = await sql`
      SELECT * FROM "KnowledgeArticle" WHERE id = ${id}
    `

    if (articles.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Загружаем файлы
    const files = await sql`
      SELECT * FROM "KnowledgeFile" WHERE "articleId" = ${id}
    `

    return NextResponse.json({ ...articles[0], files })
  } catch (error) {
    console.error("[v0] Knowledge article GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log("[v0] Knowledge API DELETE: Deleting article", id)

    const currentUser = await verifyRequest(request)

    if (!currentUser) {
      console.log("[v0] Knowledge API DELETE: Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk", "uk_employee"].includes(currentUser.role)) {
      console.log("[v0] Knowledge API DELETE: Forbidden - only UK can delete")
      return NextResponse.json({ error: "Forbidden - only UK can delete articles" }, { status: 403 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if article exists
    const articles = await sql`
      SELECT id FROM "KnowledgeArticle" WHERE id = ${id}
    `

    if (articles.length === 0) {
      console.log("[v0] Knowledge API DELETE: Article not found")
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Delete associated files first
    await sql`DELETE FROM "KnowledgeFile" WHERE "articleId" = ${id}`

    // Delete read statuses
    await sql`DELETE FROM "ArticleReadStatus" WHERE "articleId" = ${id}`

    // Delete the article
    await sql`DELETE FROM "KnowledgeArticle" WHERE id = ${id}`

    console.log("[v0] Knowledge API DELETE: Article deleted successfully")
    return NextResponse.json({ success: true, message: "Article deleted successfully" })
  } catch (error) {
    console.error("[v0] Knowledge article DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const currentUser = await verifyRequest(request)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk", "uk_employee"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden - only UK can edit articles" }, { status: 403 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    const body = await request.json()
    const { title, content, category, type, tags, videoUrl, files } = body

    // Check if article exists
    const articles = await sql`
      SELECT id FROM "KnowledgeArticle" WHERE id = ${id}
    `

    if (articles.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    await sql`
      UPDATE "KnowledgeArticle"
      SET 
        title = ${title},
        content = ${content},
        category = ${category},
        type = ${type || "article"},
        tags = ${tags || []},
        "videoUrl" = ${videoUrl || null},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `

    if (files !== undefined) {
      await sql`DELETE FROM "KnowledgeFile" WHERE "articleId" = ${id}`

      if (files && files.length > 0) {
        for (const file of files) {
          const fileId = file.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          await sql`
            INSERT INTO "KnowledgeFile" (id, "articleId", name, url, size, "mimeType", type, "uploadedAt")
            VALUES (${fileId}, ${id}, ${file.name}, ${file.url}, ${file.size || "0"}, ${file.mimeType || null}, ${file.type || "other"}, NOW())
          `
          console.log("[v0] Knowledge API PUT: Saved file", file.name, "with type", file.type)
        }
      }
    }

    return NextResponse.json({ success: true, message: "Article updated successfully" })
  } catch (error) {
    console.error("[v0] Knowledge article PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
