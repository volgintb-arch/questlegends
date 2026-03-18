import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyRequest } from "@/lib/simple-auth"

// Map user role to targetRoles keys that they should see
function getRoleKeys(userRole: string): string[] {
  switch (userRole) {
    case "super_admin":
    case "uk":
    case "uk_employee":
      return ["uk"]
    case "franchisee":
    case "own_point":
      return ["franchisee"]
    case "admin":
      return ["admin"]
    case "employee":
      return ["employee"]
    case "animator":
      return ["animator"]
    case "host":
      return ["host"]
    case "dj":
      return ["dj"]
    default:
      return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    // Get all articles first
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

    // UK roles see everything, other roles see filtered articles
    const isUK = ["super_admin", "uk", "uk_employee"].includes(user.role)
    const userRoleKeys = getRoleKeys(user.role)

    const filteredArticles = isUK
      ? articles
      : articles.filter((a: any) => {
          const roles: string[] = a.targetRoles || []
          // If targetRoles is empty — check old targetRole field for backward compat
          if (roles.length === 0) {
            const oldRole = a.targetRole
            if (!oldRole) return true // No target = visible to all
            return userRoleKeys.includes(oldRole)
          }
          // Article is visible if ANY of its targetRoles matches the user
          return roles.some((r: string) => userRoleKeys.includes(r))
        })

    const articlesWithExtras = await Promise.all(
      filteredArticles.map(async (article: any) => {
        const files = await sql`
          SELECT id, "articleId", name, url, size, "mimeType", type, "uploadedAt"
          FROM "KnowledgeFile" WHERE "articleId" = ${article.id}
        `

        let isCompleted = false
        let completedAt = null

        const readStatus = await sql`
          SELECT "isCompleted", "completedAt" FROM "ArticleReadStatus"
          WHERE "articleId" = ${article.id} AND "userId" = ${user.userId}
        `
        if (readStatus.length > 0) {
          isCompleted = readStatus[0].isCompleted
          completedAt = readStatus[0].completedAt
        }

        const mappedFiles = (files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          url: f.url,
          type: f.type || "other",
          mimeType: f.mimeType,
          size: f.size,
        }))

        const quizRows = await sql`
          SELECT id FROM "KnowledgeQuiz" WHERE "articleId" = ${article.id} LIMIT 1
        `

        return {
          ...article,
          // Normalize: always return targetRoles array
          targetRoles: article.targetRoles?.length > 0
            ? article.targetRoles
            : article.targetRole
              ? [article.targetRole]
              : [],
          files: mappedFiles,
          isCompleted,
          completedAt,
          hasQuiz: quizRows.length > 0,
        }
      }),
    )

    return NextResponse.json({ articles: articlesWithExtras })
  } catch (error: any) {
    console.error("Knowledge articles fetch error:")
    return NextResponse.json({ articles: [], error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["uk", "super_admin", "uk_employee"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden - only UK can create articles" }, { status: 403 })
    }

    const body = await request.json()
    const { title, category, content, type, tags, videoUrl, files, targetRoles } = body

    if (!title || !category || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const id = `KB-${Date.now()}`
    const tagsArray = tags || []
    const rolesArray = targetRoles || []

    const result = await sql`
      INSERT INTO "KnowledgeArticle" (id, title, category, content, author, "authorId", type, tags, views, helpful, "videoUrl", "targetRoles", "createdAt", "updatedAt")
      VALUES (${id}, ${title}, ${category}, ${content}, ${user.name}, ${user.userId}, ${type || "article"}, ${tagsArray}, 0, 0, ${videoUrl || null}, ${rolesArray}, NOW(), NOW())
      RETURNING *
    `

    if (files && files.length > 0) {
      for (const file of files) {
        const fileId = file.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await sql`
          INSERT INTO "KnowledgeFile" (id, "articleId", name, url, size, "mimeType", type, "uploadedAt")
          VALUES (${fileId}, ${id}, ${file.name}, ${file.url}, ${file.size || "0"}, ${file.mimeType || null}, ${file.type || "other"}, NOW())
        `
      }
    }

    return NextResponse.json({ article: result[0] }, { status: 201 })
  } catch (error: any) {
    console.error("Knowledge article creation error:")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
