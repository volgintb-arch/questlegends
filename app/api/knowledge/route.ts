import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@neondatabase/serverless"

const databaseUrl = process.env.DATABASE_URL!

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    let query = `
      SELECT 
        ka.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', kf.id,
              'name', kf.name,
              'url', kf.url,
              'size', kf.size,
              'uploadedAt', kf."uploadedAt"
            )
          ) FILTER (WHERE kf.id IS NOT NULL),
          '[]'
        ) as files
      FROM "KnowledgeArticle" ka
      LEFT JOIN "KnowledgeFile" kf ON ka.id = kf."articleId"
    `

    const conditions: string[] = []
    const params: any[] = []

    if (category && category !== "all") {
      conditions.push(`ka.category = $${params.length + 1}`)
      params.push(category)
    }

    if (search) {
      conditions.push(`(ka.title ILIKE $${params.length + 1} OR ka.content ILIKE $${params.length + 1})`)
      params.push(`%${search}%`)
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ")
    }

    query += ` GROUP BY ka.id ORDER BY ka."createdAt" DESC`

    const articles = await sql(databaseUrl, query, params)

    return NextResponse.json({ articles })
  } catch (error: any) {
    console.error("[v0] Knowledge articles fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, category, content, author, authorId, type, tags, files } = body

    if (!title || !category || !content || !author) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Insert article
    const [article] = await sql(databaseUrl)`
      INSERT INTO "KnowledgeArticle" (
        id, title, category, content, author, "authorId", type, tags, "createdAt", "updatedAt"
      ) VALUES (
        ${`KB-${Date.now()}`},
        ${title},
        ${category},
        ${content},
        ${author},
        ${authorId ? authorId : null},
        ${type ? type : "article"},
        ${tags ? tags : []},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    // Insert files if provided
    if (files && files.length > 0) {
      for (const file of files) {
        await sql(databaseUrl)`
          INSERT INTO "KnowledgeFile" (
            id, "articleId", name, url, size, "uploadedAt"
          ) VALUES (
            ${file.id},
            ${article.id},
            ${file.name},
            ${file.url},
            ${file.size},
            NOW()
          )
        `
      }
    }

    return NextResponse.json({ article }, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Knowledge article creation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
