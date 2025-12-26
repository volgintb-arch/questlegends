import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

// GET /api/social-integrations - получить конфигурации
export async function GET(req: NextRequest) {
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

    let configs

    if (payload.role === "super_admin" || payload.role === "uk" || payload.role === "uk_employee") {
      configs = await sql`
        SELECT * FROM "SocialMediaConfig" 
        WHERE "isGlobal" = true AND "franchiseeId" IS NULL
        ORDER BY "createdAt" DESC
      `
    } else if (payload.role === "franchisee" || payload.role === "own_point") {
      configs = await sql`
        SELECT * FROM "SocialMediaConfig" 
        WHERE "franchiseeId" = ${payload.franchiseeId} AND "isGlobal" = false
        ORDER BY "createdAt" DESC
      `
    } else {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: configs })
  } catch (error) {
    console.error("[v0] Error fetching social integrations:", error)
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 })
  }
}

// POST /api/social-integrations - создать новую конфигурацию
export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const {
      platform,
      isEnabled = true,
      apiKey,
      apiSecret,
      webhookUrl,
      accessToken,
      pageId,
      botToken,
      accountUsername,
      notes,
    } = body

    if (!platform) {
      return NextResponse.json({ error: "Platform is required" }, { status: 400 })
    }

    let config

    if (payload.role === "super_admin" || payload.role === "uk" || payload.role === "uk_employee") {
      ;[config] = await sql`
        INSERT INTO "SocialMediaConfig" (
          "platform", "franchiseeId", "isGlobal", "isEnabled",
          "apiKey", "apiSecret", "webhookUrl", "accessToken",
          "pageId", "botToken", "accountUsername", "notes"
        )
        VALUES (
          ${platform}, NULL, true, ${isEnabled},
          ${apiKey || null}, ${apiSecret || null}, ${webhookUrl || null}, ${accessToken || null},
          ${pageId || null}, ${botToken || null}, ${accountUsername || null}, ${notes || null}
        )
        RETURNING *
      `
    } else if (payload.role === "franchisee" || payload.role === "own_point") {
      ;[config] = await sql`
        INSERT INTO "SocialMediaConfig" (
          "platform", "franchiseeId", "isGlobal", "isEnabled",
          "apiKey", "apiSecret", "webhookUrl", "accessToken",
          "pageId", "botToken", "accountUsername", "notes"
        )
        VALUES (
          ${platform}, ${payload.franchiseeId}, false, ${isEnabled},
          ${apiKey || null}, ${apiSecret || null}, ${webhookUrl || null}, ${accessToken || null},
          ${pageId || null}, ${botToken || null}, ${accountUsername || null}, ${notes || null}
        )
        RETURNING *
      `
    } else {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error("[v0] Error creating social integration:", error)
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 })
  }
}
