import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

console.log("[v0] Knowledge API module loaded")

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
      name: payload.name as string,
      role: payload.role as string,
    }
  } catch (error) {
    console.error("[v0] Knowledge API auth error:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  console.log("[v0] Knowledge API: GET request started")

  try {
    if (!process.env.DATABASE_URL) {
      console.error("[v0] Knowledge API: DATABASE_URL not set")
      return NextResponse.json({ articles: [] })
    }

    const sql = neon(process.env.DATABASE_URL)
    const user = await getCurrentUser(request)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    console.log("[v0] Knowledge API: category:", category, "search:", search)

    let articles

    if (category && category !== "all" && search) {
      articles = await sql`
        SELECT * FROM "KnowledgeArticle" 
        WHERE category = ${category} 
        AND (title ILIKE ${"%" + search + "%"} OR content ILIKE ${"%" + search + "%"})
        ORDER BY "createdAt" DESC
      `
    } else if (category && category !== "all") {
      articles = await sql`
        SELECT * FROM "KnowledgeArticle" 
        WHERE category = ${category}
        ORDER BY "createdAt" DESC
      `
    } else if (search) {
      articles = await sql`
        SELECT * FROM "KnowledgeArticle" 
        WHERE title ILIKE ${"%" + search + "%"} OR content ILIKE ${"%" + search + "%"}
        ORDER BY "createdAt" DESC
      `
    } else {
      articles = await sql`
        SELECT * FROM "KnowledgeArticle" 
        ORDER BY "createdAt" DESC
      `
    }

    const articlesWithExtras = await Promise.all(
      articles.map(async (article: any) => {
        const files = await sql`
          SELECT id, "articleId", name, url, size, "mimeType", type, "uploadedAt" 
          FROM "KnowledgeFile" WHERE "articleId" = ${article.id}
        `

        // Проверяем статус прочтения для текущего пользователя
        let isCompleted = false
        let completedAt = null

        if (user) {
          const readStatus = await sql`
            SELECT "isCompleted", "completedAt" FROM "ArticleReadStatus" 
            WHERE "articleId" = ${article.id} AND "userId" = ${user.id}
          `
          if (readStatus.length > 0) {
            isCompleted = readStatus[0].isCompleted
            completedAt = readStatus[0].completedAt
          }
        }

        const mappedFiles = (files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          url: f.url,
          type: f.type || "other",
          mimeType: f.mimeType,
          size: f.size,
        }))

        console.log("[v0] Knowledge API: Article", article.id, "has", mappedFiles.length, "files")

        return {
          ...article,
          files: mappedFiles,
          isCompleted,
          completedAt,
        }
      }),
    )

    console.log("[v0] Knowledge API: Found", articlesWithExtras.length, "articles")

    return NextResponse.json({ articles: articlesWithExtras })
  } catch (error: any) {
    console.error("[v0] Knowledge articles fetch error:", error)
    return NextResponse.json({ articles: [], error: error.message }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] Knowledge API: POST request started")

  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["uk", "super_admin", "uk_employee"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden - only UK can create articles" }, { status: 403 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)
    const body = await request.json()
    const { title, category, content, type, tags, videoUrl, files } = body

    console.log("[v0] Knowledge API POST: Creating article with", files?.length || 0, "files")
    console.log("[v0] Knowledge API POST: videoUrl:", videoUrl)
    console.log("[v0] Knowledge API POST: files:", JSON.stringify(files))

    if (!title || !category || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const id = `KB-${Date.now()}`
    const tagsArray = tags || []

    const result = await sql`
      INSERT INTO "KnowledgeArticle" (id, title, category, content, author, "authorId", type, tags, views, helpful, "videoUrl", "createdAt", "updatedAt")
      VALUES (${id}, ${title}, ${category}, ${content}, ${user.name}, ${user.id}, ${type || "article"}, ${tagsArray}, 0, 0, ${videoUrl || null}, NOW(), NOW())
      RETURNING *
    `

    if (files && files.length > 0) {
      for (const file of files) {
        const fileId = file.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await sql`
          INSERT INTO "KnowledgeFile" (id, "articleId", name, url, size, "mimeType", type, "uploadedAt")
          VALUES (${fileId}, ${id}, ${file.name}, ${file.url}, ${file.size || "0"}, ${file.mimeType || null}, ${file.type || "other"}, NOW())
        `
        console.log("[v0] Knowledge API: Saved file", file.name, "with type", file.type)
      }
    }

    console.log("[v0] Knowledge API: Article created:", id)

    return NextResponse.json({ article: result[0] }, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Knowledge article creation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
