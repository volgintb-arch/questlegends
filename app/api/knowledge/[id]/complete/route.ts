import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: articleId } = await params

    const sql = neon(process.env.DATABASE_URL!)

    const existing = await sql`
      SELECT id FROM "ArticleReadStatus"
      WHERE "articleId" = ${articleId} AND "userId" = ${user.userId}
    `

    if (existing.length > 0) {
      await sql`
        UPDATE "ArticleReadStatus"
        SET "isCompleted" = true, "completedAt" = NOW()
        WHERE "articleId" = ${articleId} AND "userId" = ${user.userId}
      `
    } else {
      await sql`
        INSERT INTO "ArticleReadStatus" (id, "articleId", "userId", "readAt", "isCompleted", "completedAt")
        VALUES (gen_random_uuid()::TEXT, ${articleId}, ${user.userId}, NOW(), true, NOW())
      `
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[knowledge/complete] POST error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
