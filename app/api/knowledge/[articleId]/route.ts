import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { articleId: string } }) {
  try {
    const { articleId } = params

    const [article] = await sql`
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
      WHERE ka.id = ${articleId}
      GROUP BY ka.id
    `

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Increment views
    await sql`
      UPDATE "KnowledgeArticle"
      SET views = views + 1
      WHERE id = ${articleId}
    `

    return NextResponse.json({ article })
  } catch (error: any) {
    console.error("[v0] Knowledge article fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { articleId: string } }) {
  try {
    const { articleId } = params
    const body = await request.json()
    const { title, category, content, type, tags, files } = body

    // Update article
    await sql`
      UPDATE "KnowledgeArticle"
      SET 
        title = ${title},
        category = ${category},
        content = ${content},
        type = ${type},
        tags = ${tags},
        "updatedAt" = NOW()
      WHERE id = ${articleId}
    `

    // Delete old files
    await sql`DELETE FROM "KnowledgeFile" WHERE "articleId" = ${articleId}`

    // Insert new files
    if (files && files.length > 0) {
      for (const file of files) {
        await sql`
          INSERT INTO "KnowledgeFile" (
            id, "articleId", name, url, size, "uploadedAt"
          ) VALUES (
            ${file.id},
            ${articleId},
            ${file.name},
            ${file.url},
            ${file.size},
            NOW()
          )
        `
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Knowledge article update error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { articleId: string } }) {
  try {
    const { articleId } = params

    await sql`DELETE FROM "KnowledgeArticle" WHERE id = ${articleId}`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Knowledge article deletion error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
