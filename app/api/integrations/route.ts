import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/simple-auth"
import { sql } from "@/lib/db"
import { IntegrationHub } from "@/lib/integration-hub/integration-hub"
import { AccessControl } from "@/lib/access-control"
import { AuditLog } from "@/lib/audit-log"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = new AccessControl(user)
    if (!access.canAccessModule("integrations")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Фильтр по владельцу
    let integrations
    if (access.isUKStaff()) {
      // УК видит только свои интеграции
      integrations = await sql`
        SELECT * FROM Integration
        WHERE owner_type = 'uk'
        ORDER BY created_at DESC
      `
    } else if (access.isFranchiseStaff()) {
      // Франчайзи видит только свои интеграции
      integrations = await sql`
        SELECT * FROM Integration
        WHERE owner_type = 'franchisee'
        AND owner_id = ${user.franchisee_id}
        ORDER BY created_at DESC
      `
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ integrations })
  } catch (error) {
    console.error("[v0] Error fetching integrations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = new AccessControl(user)
    if (!access.canAccessModule("integrations") || !access.canPerformAction("integrations", "create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { channel, credentials, assignment_strategy, default_assignee_id } = body

    // Валидация channel
    const validChannels = ["telegram", "instagram", "vk", "whatsapp", "avito", "max"]
    if (!channel || !validChannels.includes(channel)) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 })
    }

    // Определить owner_type и owner_id
    let owner_type: string
    let owner_id: string | null = null

    if (access.isUKStaff()) {
      owner_type = "uk"
    } else if (access.isFranchiseStaff()) {
      owner_type = "franchisee"
      owner_id = user.franchisee_id
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Создать интеграцию
    const result = await sql`
      INSERT INTO Integration (
        owner_type,
        owner_id,
        channel,
        credentials,
        assignment_strategy,
        default_assignee_id,
        is_active
      ) VALUES (
        ${owner_type},
        ${owner_id},
        ${channel},
        ${JSON.stringify(credentials || {})},
        ${assignment_strategy || "first_admin"},
        ${default_assignee_id || null},
        true
      )
      RETURNING *
    `

    const integration = result[0]

    // Сгенерировать webhook URL
    const webhookUrl = IntegrationHub.generateWebhookUrl(integration.id, channel)

    // Обновить webhook_url
    await sql`
      UPDATE Integration
      SET webhook_url = ${webhookUrl}
      WHERE id = ${integration.id}
    `

    integration.webhook_url = webhookUrl

    await AuditLog.log({
      user_id: user.id,
      action: "integration_created",
      resource_type: "integration",
      resource_id: integration.id,
      details: { channel, owner_type, owner_id },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ integration }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
