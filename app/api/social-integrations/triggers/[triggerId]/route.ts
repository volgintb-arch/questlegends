import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

// PUT /api/social-integrations/triggers/[triggerId] - обновить триггер
export async function PUT(req: NextRequest, { params }: { params: { triggerId: string } }) {
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

    const { triggerId } = params
    const body = await req.json()

    const [updated] = await sql`
      UPDATE "LeadTrigger"
      SET
        "keyword" = COALESCE(${body.keyword}, "keyword"),
        "isActive" = COALESCE(${body.isActive}, "isActive"),
        "autoCreateLead" = COALESCE(${body.autoCreateLead}, "autoCreateLead"),
        "autoReplyMessage" = COALESCE(${body.autoReplyMessage}, "autoReplyMessage"),
        "priority" = COALESCE(${body.priority}, "priority")
      WHERE "id" = ${triggerId}
      RETURNING *
    `

    if (!updated) {
      return NextResponse.json({ error: "Trigger not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Error updating trigger:", error)
    return NextResponse.json({ error: "Failed to update trigger" }, { status: 500 })
  }
}

// DELETE /api/social-integrations/triggers/[triggerId] - удалить триггер
export async function DELETE(req: NextRequest, { params }: { params: { triggerId: string } }) {
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

    const { triggerId } = params

    await sql`
      DELETE FROM "LeadTrigger" WHERE "id" = ${triggerId}
    `

    return NextResponse.json({ success: true, message: "Trigger deleted" })
  } catch (error) {
    console.error("[v0] Error deleting trigger:", error)
    return NextResponse.json({ error: "Failed to delete trigger" }, { status: 500 })
  }
}
