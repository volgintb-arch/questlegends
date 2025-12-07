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

    console.log("[v0] Knowledge API: Found", articles.length, "articles")

    return NextResponse.json({ articles })
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

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)
    const body = await request.json()
    const { title, category, content, type, tags } = body

    if (!title || !category || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const id = `KB-${Date.now()}`
    const tagsArray = tags || []

    const result = await sql`
      INSERT INTO "KnowledgeArticle" (id, title, category, content, author, "authorId", type, tags, views, helpful, "createdAt", "updatedAt")
      VALUES (${id}, ${title}, ${category}, ${content}, ${user.name}, ${user.id}, ${type || "article"}, ${tagsArray}, 0, 0, NOW(), NOW())
      RETURNING *
    `

    console.log("[v0] Knowledge API: Article created:", id)

    return NextResponse.json({ article: result[0] }, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Knowledge article creation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
