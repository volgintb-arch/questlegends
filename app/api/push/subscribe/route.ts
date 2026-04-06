import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { subscription } = await request.json()
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    const userAgent = request.headers.get("user-agent") || null

    await sql`
      INSERT INTO "PushSubscription" (id, "userId", endpoint, p256dh, auth, "userAgent", "createdAt")
      VALUES (
        ${crypto.randomUUID()},
        ${user.userId},
        ${subscription.endpoint},
        ${subscription.keys.p256dh},
        ${subscription.keys.auth},
        ${userAgent},
        NOW()
      )
      ON CONFLICT (endpoint) DO UPDATE SET
        "userId" = ${user.userId},
        p256dh = ${subscription.keys.p256dh},
        auth = ${subscription.keys.auth},
        "userAgent" = ${userAgent}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Push] Subscribe error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { endpoint } = await request.json()
    if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })

    await sql`
      DELETE FROM "PushSubscription"
      WHERE endpoint = ${endpoint} AND "userId" = ${user.userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Push] Unsubscribe error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
