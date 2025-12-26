import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

async function getCurrentUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")

    const { payload } = await verifyRequest(token, secret)
    return {
      id: payload.userId as string,
      name: payload.name as string,
      role: payload.role as string,
    }
  } catch (error) {
    console.error("[v0] Knowledge complete API auth error:", error)
    return null
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: articleId } = await params

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Проверяем существует ли уже запись
    const existing = await sql`
      SELECT id FROM "ArticleReadStatus" 
      WHERE "articleId" = ${articleId} AND "userId" = ${user.id}
    `

    if (existing.length > 0) {
      // Обновляем существующую запись
      await sql`
        UPDATE "ArticleReadStatus" 
        SET "isCompleted" = true, "completedAt" = NOW()
        WHERE "articleId" = ${articleId} AND "userId" = ${user.id}
      `
    } else {
      // Создаем новую запись
      await sql`
        INSERT INTO "ArticleReadStatus" (id, "articleId", "userId", "readAt", "isCompleted", "completedAt")
        VALUES (gen_random_uuid()::TEXT, ${articleId}, ${user.id}, NOW(), true, NOW())
      `
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error marking article as completed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
