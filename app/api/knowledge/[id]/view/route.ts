import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: articleId } = await params

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Увеличиваем счетчик просмотров
    await sql`
      UPDATE "KnowledgeArticle" 
      SET views = COALESCE(views, 0) + 1
      WHERE id = ${articleId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error incrementing view count:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
