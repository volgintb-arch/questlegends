import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { sql } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit-log"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = user.role
    const { id } = await params

    // Only owners and admins can delete
    if (!["super_admin", "uk", "franchisee", "own_point"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get integration first
    const integrations = await sql`
      SELECT * FROM integration WHERE id = ${id}::uuid LIMIT 1
    `

    if ((integrations as any[]).length === 0) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    const integration = (integrations as any[])[0]

    // Check ownership for franchisees
    if ((role === "franchisee" || role === "own_point") && integration.owner_id !== user.franchiseeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete integration (cascades to trigger rules, inbound messages, etc)
    await sql`DELETE FROM integration WHERE id = ${id}::uuid`

    // Audit log
    await logAuditEvent({
      action: "integration_message",
      entityType: "integration",
      entityId: id,
      userId: user.userId,
      userName: user.name,
      userRole: role,
      franchiseeId: user.franchiseeId || null,
      details: { action: "deleted", channel: integration.channel },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = user.role
    const { id } = await params

    if (!["super_admin", "uk", "franchisee", "own_point"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // Get integration first
    const integrations = await sql`
      SELECT * FROM integration WHERE id = ${id}::uuid LIMIT 1
    `

    if ((integrations as any[]).length === 0) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    const integration = (integrations as any[])[0]

    // Check ownership
    if ((role === "franchisee" || role === "own_point") && integration.owner_id !== user.franchiseeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update fields
    const { is_active, credentials, assignment_strategy, auto_lead_creation, default_assignee_id } = body

    const result = await sql`
      UPDATE integration SET
        is_active = COALESCE(${is_active ?? null}::boolean, is_active),
        credentials = COALESCE(${credentials ? JSON.stringify(credentials) : null}::jsonb, credentials),
        assignment_strategy = COALESCE(${assignment_strategy ?? null}, assignment_strategy),
        auto_lead_creation = COALESCE(${auto_lead_creation ?? null}::boolean, auto_lead_creation),
        default_assignee_id = COALESCE(${default_assignee_id ?? null}, default_assignee_id),
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `

    return NextResponse.json({ integration: (result as any[])[0] })
  } catch (error) {
    console.error("[v0] Error updating integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
