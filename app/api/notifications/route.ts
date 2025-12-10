import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.userId as string,
      role: payload.role as string,
      franchiseeId: payload.franchiseeId as string | null,
    }
  } catch {
    return null
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      if (i === retries || !error?.message?.includes("Failed to fetch")) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)))
    }
  }
  throw new Error("Max retries reached")
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Notifications API: GET request started")

    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filterType = searchParams.get("type")
    const filterRead = searchParams.get("read")
    const unreadOnly = searchParams.get("unreadOnly")

    const notifications = await withRetry(async () => {
      const sql = getSql()

      // Check if table exists first
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'Notification'
        ) as exists
      `

      if (!tableCheck[0]?.exists) {
        return []
      }

      if (unreadOnly === "true") {
        const result = await sql`
          SELECT COUNT(*) as count
          FROM "Notification"
          WHERE "recipientId" = ${user.id}
            AND "isArchived" = false
            AND "isRead" = false
        `
        return { count: Number.parseInt(result[0]?.count || "0") }
      }

      // Build query based on filters
      if (filterType && filterType !== "all" && filterRead && filterRead !== "all") {
        const isRead = filterRead === "read"
        return await sql`
          SELECT n.*, s.name as "senderName", s.role as "senderRole",
                 n."relatedDealId", n."relatedTaskId"
          FROM "Notification" n
          LEFT JOIN "User" s ON n."senderId" = s.id
          WHERE n."recipientId" = ${user.id}
            AND n."isArchived" = false
            AND n.type = ${filterType}
            AND n."isRead" = ${isRead}
          ORDER BY n."createdAt" DESC
        `
      } else if (filterType && filterType !== "all") {
        return await sql`
          SELECT n.*, s.name as "senderName", s.role as "senderRole",
                 n."relatedDealId", n."relatedTaskId"
          FROM "Notification" n
          LEFT JOIN "User" s ON n."senderId" = s.id
          WHERE n."recipientId" = ${user.id}
            AND n."isArchived" = false
            AND n.type = ${filterType}
          ORDER BY n."createdAt" DESC
        `
      } else if (filterRead && filterRead !== "all") {
        const isRead = filterRead === "read"
        return await sql`
          SELECT n.*, s.name as "senderName", s.role as "senderRole",
                 n."relatedDealId", n."relatedTaskId"
          FROM "Notification" n
          LEFT JOIN "User" s ON n."senderId" = s.id
          WHERE n."recipientId" = ${user.id}
            AND n."isArchived" = false
            AND n."isRead" = ${isRead}
          ORDER BY n."createdAt" DESC
        `
      } else {
        return await sql`
          SELECT n.*, s.name as "senderName", s.role as "senderRole",
                 n."relatedDealId", n."relatedTaskId"
          FROM "Notification" n
          LEFT JOIN "User" s ON n."senderId" = s.id
          WHERE n."recipientId" = ${user.id}
            AND n."isArchived" = false
          ORDER BY n."createdAt" DESC
        `
      }
    })

    if (unreadOnly === "true" && typeof notifications === "object" && "count" in notifications) {
      return NextResponse.json({ success: true, count: notifications.count })
    }

    const transformed = Array.isArray(notifications)
      ? notifications.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          location: n.location,
          dealId: n.relatedDealId || n.dealId,
          taskId: n.relatedTaskId,
          isRead: n.isRead,
          isArchived: n.isArchived,
          createdAt: n.createdAt,
          sender: n.senderName ? { id: n.senderId, name: n.senderName, role: n.senderRole } : null,
          deal: n.relatedDealId ? { id: n.relatedDealId } : null,
          comments: [],
        }))
      : []

    return NextResponse.json({ success: true, data: { notifications: transformed } })
  } catch (error) {
    console.error("[v0] NOTIFICATIONS_GET error:", error)
    return NextResponse.json({ success: true, data: { notifications: [] }, count: 0 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Notifications API: POST request started")

    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, message, recipientId, location, dealId } = body

    if (!type || !title || !message || !recipientId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await getSql()`
      INSERT INTO "Notification" (
        id, type, title, message, location, "relatedDealId", "senderId", "recipientId", 
        "isRead", "isArchived", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${type}, ${title}, ${message}, ${location || null}, ${dealId || null}, 
        ${user.id}, ${recipientId}, false, false, ${now}, ${now}
      )
    `

    console.log("[v0] Notification created successfully")

    return NextResponse.json({
      success: true,
      data: {
        notification: {
          id,
          type,
          title,
          message,
          location,
          dealId,
          senderId: user.id,
          recipientId,
          isRead: false,
          isArchived: false,
          createdAt: now,
        },
      },
    })
  } catch (error) {
    console.error("[v0] NOTIFICATIONS_POST error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
