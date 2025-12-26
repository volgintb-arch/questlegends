import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

// GET /api/social-integrations/[configId] - получить одну конфигурацию
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

    const [config] = await sql`
      SELECT * FROM "SocialMediaConfig" WHERE "id" = ${configId}
    `

    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
    }

    // Проверка доступа
    if (payload.role !== "super_admin") {
      if (config.franchiseeId !== payload.franchiseeId && !config.isGlobal) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error("[v0] Error fetching social integration:", error)
    return NextResponse.json({ error: "Failed to fetch integration" }, { status: 500 })
  }
}

// PUT /api/social-integrations/[configId] - обновить конфигурацию
export async function PUT(req: NextRequest, { params }: { params: { configId: string } }) {
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

    const [existingConfig] = await sql`
      SELECT * FROM "SocialMediaConfig" WHERE "id" = ${configId}
    `

    if (!existingConfig) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
    }

    // Проверка доступа
    if (payload.role !== "super_admin") {
      if (existingConfig.franchiseeId !== payload.franchiseeId || existingConfig.isGlobal) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    const [updated] = await sql`
      UPDATE "SocialMediaConfig"
      SET
        "isEnabled" = COALESCE(${body.isEnabled}, "isEnabled"),
        "apiKey" = COALESCE(${body.apiKey}, "apiKey"),
        "apiSecret" = COALESCE(${body.apiSecret}, "apiSecret"),
        "webhookUrl" = COALESCE(${body.webhookUrl}, "webhookUrl"),
        "accessToken" = COALESCE(${body.accessToken}, "accessToken"),
        "pageId" = COALESCE(${body.pageId}, "pageId"),
        "botToken" = COALESCE(${body.botToken}, "botToken"),
        "accountUsername" = COALESCE(${body.accountUsername}, "accountUsername"),
        "notes" = COALESCE(${body.notes}, "notes"),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${configId}
      RETURNING *
    `

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Error updating social integration:", error)
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 })
  }
}

// DELETE /api/social-integrations/[configId] - удалить конфигурацию
export async function DELETE(req: NextRequest, { params }: { params: { configId: string } }) {
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

    const [existingConfig] = await sql`
      SELECT * FROM "SocialMediaConfig" WHERE "id" = ${configId}
    `

    if (!existingConfig) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
    }

    // Только super_admin может удалять глобальные конфигурации
    if (existingConfig.isGlobal && payload.role !== "super_admin") {
      return NextResponse.json({ error: "Only super_admin can delete global configs" }, { status: 403 })
    }

    // franchisee может удалять только свои конфигурации
    if (payload.role !== "super_admin" && existingConfig.franchiseeId !== payload.franchiseeId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    await sql`
      DELETE FROM "SocialMediaConfig" WHERE "id" = ${configId}
    `

    return NextResponse.json({ success: true, message: "Config deleted" })
  } catch (error) {
    console.error("[v0] Error deleting social integration:", error)
    return NextResponse.json({ error: "Failed to delete integration" }, { status: 500 })
  }
}
