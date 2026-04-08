import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { sql } from "@/lib/db"

// GET — получить настройки Sipuni
export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const franchiseeId = user.franchiseeId || null

    // Для УК — глобальные настройки (franchiseeId IS NULL)
    // Для франчайзи — свои настройки
    const isUK = ["super_admin", "uk", "uk_employee"].includes(user.role)

    let settings
    if (isUK) {
      settings = await sql`
        SELECT id, "franchiseeId", "apiKey", "sipNumbers", "isActive", "createdAt"
        FROM sipuni_settings
        WHERE "franchiseeId" IS NULL
        LIMIT 1
      `
    } else {
      settings = await sql`
        SELECT id, "franchiseeId", "apiKey", "sipNumbers", "isActive", "createdAt"
        FROM sipuni_settings
        WHERE "franchiseeId" = ${franchiseeId}
        LIMIT 1
      `
    }

    return NextResponse.json({ settings: settings[0] || null })
  } catch (error) {
    console.error("[sipuni] Settings GET error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// POST — сохранить/обновить настройки Sipuni
export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const allowedRoles = ["super_admin", "uk", "franchisee", "own_point"]
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { apiKey, sipNumbers } = body

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    const isUK = ["super_admin", "uk"].includes(user.role)
    const franchiseeId = isUK ? null : user.franchiseeId

    const sipNums = Array.isArray(sipNumbers) ? sipNumbers.filter(Boolean) : []
    const webhookSecret = globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)

    // Upsert
    const existing = franchiseeId
      ? await sql`SELECT id FROM sipuni_settings WHERE "franchiseeId" = ${franchiseeId} LIMIT 1`
      : await sql`SELECT id FROM sipuni_settings WHERE "franchiseeId" IS NULL LIMIT 1`

    if (existing.length > 0) {
      await sql`
        UPDATE sipuni_settings
        SET "apiKey" = ${apiKey}, "sipNumbers" = ${sipNums}, "updatedAt" = NOW()
        WHERE id = ${existing[0].id}
      `
    } else {
      const id = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO sipuni_settings (id, "franchiseeId", "apiKey", "sipNumbers", "webhookSecret", "isActive", "updatedAt")
        VALUES (${id}, ${franchiseeId}, ${apiKey}, ${sipNums}, ${webhookSecret}, true, NOW())
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[sipuni] Settings POST error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
