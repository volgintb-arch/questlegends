import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

// GET /api/social-integrations/[configId]/triggers - получить триггеры
export async function GET(req: NextRequest, { params }: { params: { configId: string } }) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { configId } = params

    const triggers = await sql`
      SELECT * FROM "LeadTrigger" 
      WHERE "configId" = ${configId}
      ORDER BY "priority" DESC, "createdAt" DESC
    `

    return NextResponse.json({ success: true, data: triggers })
  } catch (error) {
    console.error("[v0] Error fetching triggers:", error)
    return NextResponse.json({ error: "Failed to fetch triggers" }, { status: 500 })
  }
}

// POST /api/social-integrations/[configId]/triggers - создать триггер
export async function POST(req: NextRequest, { params }: { params: { configId: string } }) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { configId } = params
    const body = await req.json()
    const { keyword, isActive = true, autoCreateLead = true, autoReplyMessage, priority = 0 } = body

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
    }

    const [trigger] = await sql`
      INSERT INTO "LeadTrigger" (
        "configId", "keyword", "isActive", "autoCreateLead", "autoReplyMessage", "priority"
      )
      VALUES (
        ${configId}, ${keyword}, ${isActive}, ${autoCreateLead}, ${autoReplyMessage || null}, ${priority}
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, data: trigger })
  } catch (error) {
    console.error("[v0] Error creating trigger:", error)
    return NextResponse.json({ error: "Failed to create trigger" }, { status: 500 })
  }
}
