import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { sql } from "@/lib/db"
import webpush from "web-push"

let vapidReady = false
function ensureVapid() {
  if (vapidReady) return true
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false
  webpush.setVapidDetails(
    "mailto:admin@legendaobiskatelyah.ru",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
  vapidReady = true
  return true
}

export async function POST(request: NextRequest) {
  try {
    if (!ensureVapid()) {
      return NextResponse.json({ error: "Push notifications not configured" }, { status: 503 })
    }

    const user = await verifyRequest(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { userIds, title, body, icon, url, data } = await request.json()

    if (!userIds?.length || !title || !body) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Fetch subscriptions for target users
    const placeholders = userIds.map((_: string, i: number) => `$${i + 1}`).join(", ")
    const subscriptions = await sql`
      SELECT * FROM "PushSubscription"
      WHERE "userId" = ANY(${userIds})
    `

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/icon-192.png",
      badge: "/icon-192.png",
      url: url || "/",
      data: data || {},
    })

    let sent = 0
    let failed = 0
    const toDelete: string[] = []

    await Promise.allSettled(
      (subscriptions as any[]).map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          )
          sent++
        } catch (err: any) {
          failed++
          // 410 Gone = subscription expired, remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            toDelete.push(sub.endpoint)
          }
        }
      }),
    )

    // Cleanup expired subscriptions
    if (toDelete.length > 0) {
      await sql`DELETE FROM "PushSubscription" WHERE endpoint = ANY(${toDelete})`
    }

    return NextResponse.json({ success: true, sent, failed })
  } catch (error) {
    console.error("[Push] Send error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
