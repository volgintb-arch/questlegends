import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { sql } from "@/lib/db"

// GET /api/social-integrations/[configId]/triggers - get triggers for integration
export async function GET(req: NextRequest, { params }: { params: { configId: string } }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { configId } = await params

    // Try new triggerrule table first (unified integration system)
    const triggers = await sql`
      SELECT 
        id,
        integration_id as "configId",
        trigger_type as "triggerType",
        keywords[1] as "keyword",
        keywords,
        keywords_match_type as "keywordsMatchType",
        is_active as "isActive",
        true as "autoCreateLead",
        null as "autoReplyMessage",
        priority,
        created_at as "createdAt"
      FROM triggerrule
      WHERE integration_id = ${configId}::uuid
      ORDER BY priority DESC, created_at DESC
    `

    // Also check old LeadTrigger table for backward compat
    let oldTriggers: any[] = []
    try {
      oldTriggers = await sql`
        SELECT * FROM "LeadTrigger" 
        WHERE "configId" = ${configId}
        ORDER BY "priority" DESC, "createdAt" DESC
      ` as any[]
    } catch {
      // Old table may not exist or configId format doesn't match
    }

    const allTriggers = [...(triggers as any[]), ...oldTriggers]

    return NextResponse.json({ success: true, data: allTriggers })
  } catch (error) {
    console.error("[v0] Error fetching triggers:", error)
    return NextResponse.json({ error: "Failed to fetch triggers" }, { status: 500 })
  }
}

// POST /api/social-integrations/[configId]/triggers - create trigger
export async function POST(req: NextRequest, { params }: { params: { configId: string } }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { configId } = await params
    const body = await req.json()
    const { keyword, isActive = true, autoCreateLead = true, autoReplyMessage, priority = 0 } = body

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
    }

    // Insert into new triggerrule table
    const [trigger] = await sql`
      INSERT INTO triggerrule (
        integration_id,
        trigger_type,
        keywords,
        keywords_match_type,
        is_active,
        priority
      )
      VALUES (
        ${configId}::uuid,
        'keywords',
        ${[keyword]}::text[],
        'any',
        ${isActive},
        ${priority}
      )
      RETURNING 
        id,
        integration_id as "configId",
        keywords[1] as "keyword",
        is_active as "isActive",
        true as "autoCreateLead",
        null as "autoReplyMessage",
        priority,
        created_at as "createdAt"
    ` as any[]

    return NextResponse.json({ success: true, data: trigger })
  } catch (error) {
    console.error("[v0] Error creating trigger:", error)
    return NextResponse.json({ error: "Failed to create trigger" }, { status: 500 })
  }
}
