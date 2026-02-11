import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { sql } from "@/lib/db"

// PUT /api/social-integrations/triggers/[triggerId] - update trigger
export async function PUT(req: NextRequest, { params }: { params: { triggerId: string } }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { triggerId } = await params
    const body = await req.json()

    // Try updating in triggerrule table (new)
    try {
      const [updated] = await sql`
        UPDATE triggerrule
        SET
          keywords = COALESCE(${body.keyword ? [body.keyword] : null}::text[], keywords),
          is_active = COALESCE(${body.isActive ?? null}::boolean, is_active),
          priority = COALESCE(${body.priority ?? null}::integer, priority)
        WHERE id = ${triggerId}::uuid
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

      if (updated) {
        return NextResponse.json({ success: true, data: updated })
      }
    } catch {
      // UUID cast might fail for old-style IDs
    }

    // Fallback: try old LeadTrigger table
    try {
      const [updated] = await sql`
        UPDATE "LeadTrigger"
        SET
          "keyword" = COALESCE(${body.keyword ?? null}, "keyword"),
          "isActive" = COALESCE(${body.isActive ?? null}, "isActive"),
          "autoCreateLead" = COALESCE(${body.autoCreateLead ?? null}, "autoCreateLead"),
          "autoReplyMessage" = COALESCE(${body.autoReplyMessage ?? null}, "autoReplyMessage"),
          "priority" = COALESCE(${body.priority ?? null}, "priority")
        WHERE "id" = ${triggerId}
        RETURNING *
      ` as any[]

      if (updated) {
        return NextResponse.json({ success: true, data: updated })
      }
    } catch {
      // Table may not exist
    }

    return NextResponse.json({ error: "Trigger not found" }, { status: 404 })
  } catch (error) {
    console.error("[v0] Error updating trigger:", error)
    return NextResponse.json({ error: "Failed to update trigger" }, { status: 500 })
  }
}

// DELETE /api/social-integrations/triggers/[triggerId] - delete trigger
export async function DELETE(req: NextRequest, { params }: { params: { triggerId: string } }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { triggerId } = await params

    // Try new table first
    try {
      await sql`DELETE FROM triggerrule WHERE id = ${triggerId}::uuid`
      return NextResponse.json({ success: true, message: "Trigger deleted" })
    } catch {
      // UUID cast might fail
    }

    // Fallback: old table
    try {
      await sql`DELETE FROM "LeadTrigger" WHERE "id" = ${triggerId}`
      return NextResponse.json({ success: true, message: "Trigger deleted" })
    } catch {
      // Table may not exist
    }

    return NextResponse.json({ error: "Trigger not found" }, { status: 404 })
  } catch (error) {
    console.error("[v0] Error deleting trigger:", error)
    return NextResponse.json({ error: "Failed to delete trigger" }, { status: 500 })
  }
}
