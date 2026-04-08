import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { sql } from "@/lib/db"

// POST — инициировать исходящий звонок (click-to-call)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { phone, sipNumber } = body

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // Получить настройки Sipuni
    const isUK = ["super_admin", "uk", "uk_employee"].includes(user.role)
    const franchiseeId = isUK ? null : (user.franchiseeId || null)

    let settings
    if (isUK) {
      settings = await sql`
        SELECT "apiKey", "sipNumbers" FROM sipuni_settings
        WHERE "franchiseeId" IS NULL AND "isActive" = true
        LIMIT 1
      `
    } else {
      settings = await sql`
        SELECT "apiKey", "sipNumbers" FROM sipuni_settings
        WHERE "franchiseeId" = ${franchiseeId} AND "isActive" = true
        LIMIT 1
      `
    }

    if (settings.length === 0) {
      return NextResponse.json({ error: "Sipuni не настроен" }, { status: 400 })
    }

    const { apiKey, sipNumbers } = settings[0]
    const fromNumber = sipNumber || sipNumbers?.[0]

    if (!fromNumber) {
      return NextResponse.json({ error: "Нет настроенных SIP-номеров" }, { status: 400 })
    }

    // Sipuni API: инициация звонка
    // https://doc.sipuni.com/articles/636--api/
    const cleanPhone = phone.replace(/\D/g, "")

    const callRes = await fetch("https://sipuni.com/api/callback/call_number", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        user: fromNumber,
        number: cleanPhone,
        token: apiKey,
      }),
    })

    const callData = await callRes.text()
    console.log(`[sipuni] Click-to-call: ${fromNumber} → ${cleanPhone}, response: ${callData}`)

    let result: any
    try {
      result = JSON.parse(callData)
    } catch {
      result = { raw: callData }
    }

    if (callRes.ok) {
      return NextResponse.json({ success: true, data: result })
    } else {
      return NextResponse.json({ error: "Ошибка Sipuni API", data: result }, { status: 502 })
    }
  } catch (error) {
    console.error("[sipuni] Call error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
