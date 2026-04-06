import webpush from "web-push"
import { sql } from "@/lib/db"

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return
  webpush.setVapidDetails(
    "mailto:admin@legendaobiskatelyah.ru",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
  vapidConfigured = true
}

export async function sendPushToUsers(
  userIds: string[],
  notification: {
    title: string
    body: string
    icon?: string
    url?: string
    data?: Record<string, unknown>
  },
) {
  if (!userIds.length) return
  ensureVapid()
  if (!vapidConfigured) return

  try {
    const subscriptions = await sql`
      SELECT * FROM "PushSubscription" WHERE "userId" = ANY(${userIds})
    `

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || "/icon-192.png",
      badge: "/icon-192.png",
      url: notification.url || "/",
      data: notification.data || {},
    })

    const toDelete: string[] = []

    await Promise.allSettled(
      (subscriptions as any[]).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            toDelete.push(sub.endpoint)
          }
        }
      }),
    )

    if (toDelete.length > 0) {
      await sql`DELETE FROM "PushSubscription" WHERE endpoint = ANY(${toDelete})`
    }
  } catch (error) {
    console.error("[Push] sendPushToUsers error:", error)
  }
}
