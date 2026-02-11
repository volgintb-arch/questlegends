import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { sql } from "@/lib/db"
import { IntegrationHub } from "@/lib/integration-hub/integration-hub"
import { logAuditEvent } from "@/lib/audit-log"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = user.role

    let integrations

    if (role === "super_admin" || role === "uk" || role === "uk_employee") {
      // УК видит все интеграции (глобальные + все франчайзи)
      integrations = await sql`
        SELECT 
          i.*,
          f.name as franchisee_name,
          f.city as franchisee_city
        FROM integration i
        LEFT JOIN "Franchisee" f ON i.owner_id = f.id AND i.owner_type = 'franchisee'
        ORDER BY i.created_at DESC
      `
    } else if (role === "franchisee" || role === "own_point") {
      // Франчайзи видит только свои интеграции
      integrations = await sql`
        SELECT * FROM integration
        WHERE owner_type = 'franchisee'
        AND owner_id = ${user.franchiseeId || ""}
        ORDER BY created_at DESC
      `
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Map to frontend-friendly format
    const mapped = (integrations as any[]).map((i: any) => ({
      id: i.id,
      channel: i.channel,
      platform: i.channel, // alias for backward compat
      ownerType: i.owner_type,
      ownerId: i.owner_id,
      franchiseeName: i.franchisee_name || null,
      franchiseeCity: i.franchisee_city || null,
      isActive: i.is_active,
      isEnabled: i.is_active, // alias
      webhookUrl: i.webhook_url,
      assignmentStrategy: i.assignment_strategy,
      autoLeadCreation: i.auto_lead_creation,
      credentials: i.credentials || {},
      lastMessageAt: i.last_message_at,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    }))

    return NextResponse.json({ integrations: mapped })
  } catch (error) {
    console.error("[v0] Error fetching integrations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = user.role

    // Only owners and admins can create
    if (!["super_admin", "uk", "franchisee", "own_point"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { channel, credentials, assignment_strategy, default_assignee_id } = body

    // Validate channel
    const validChannels = ["telegram", "instagram", "vk", "whatsapp", "avito"]
    if (!channel || !validChannels.includes(channel)) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 })
    }

    // Determine owner
    let owner_type: string
    let owner_id: string | null = null

    if (role === "super_admin" || role === "uk") {
      owner_type = "uk"
    } else {
      owner_type = "franchisee"
      owner_id = user.franchiseeId || null
    }

    // Check for duplicate channel for this owner
    const existing = await sql`
      SELECT id FROM integration
      WHERE owner_type = ${owner_type}
      AND (owner_id = ${owner_id} OR (owner_id IS NULL AND ${owner_id}::text IS NULL))
      AND channel = ${channel}
      LIMIT 1
    `

    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        { error: `Интеграция ${channel} уже существует. Удалите существующую перед созданием новой.` },
        { status: 409 },
      )
    }

    // Create integration
    const result = await sql`
      INSERT INTO integration (
        owner_type,
        owner_id,
        channel,
        credentials,
        assignment_strategy,
        default_assignee_id,
        is_active,
        auto_lead_creation
      ) VALUES (
        ${owner_type},
        ${owner_id},
        ${channel},
        ${JSON.stringify(credentials || {})}::jsonb,
        ${assignment_strategy || "first_admin"},
        ${default_assignee_id || null},
        true,
        true
      )
      RETURNING *
    `

    const integration = (result as any[])[0]

    // Generate webhook URL
    const webhookUrl = IntegrationHub.generateWebhookUrl(integration.id, channel)

    // Update webhook_url
    await sql`
      UPDATE integration
      SET webhook_url = ${webhookUrl}
      WHERE id = ${integration.id}
    `

    integration.webhook_url = webhookUrl

    // Audit log
    await logAuditEvent({
      action: "integration_message",
      entityType: "integration",
      entityId: integration.id,
      userId: user.userId,
      userName: user.name,
      userRole: role,
      franchiseeId: user.franchiseeId || null,
      details: { action: "created", channel, owner_type, owner_id },
    })

    return NextResponse.json({ integration }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
