import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

const sql = neon(process.env.DATABASE_URL!)

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

    console.log("[v0] Notifications API: user:", user.id, "filterType:", filterType, "filterRead:", filterRead)

    // Check if Notification table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'Notification'
      ) as exists
    `

    if (!tableCheck[0]?.exists) {
      console.log("[v0] Notifications API: Table does not exist, returning empty array")
      return NextResponse.json({ success: true, data: { notifications: [] } })
    }

    // Build query based on filters
    let notifications
    if (filterType && filterType !== "all" && filterRead && filterRead !== "all") {
      const isRead = filterRead === "read"
      notifications = await sql`
        SELECT 
          n.*,
          s.name as "senderName",
          s.role as "senderRole"
        FROM "Notification" n
        LEFT JOIN "User" s ON n."senderId" = s.id
        WHERE n."recipientId" = ${user.id}
          AND n."isArchived" = false
          AND n.type = ${filterType}
          AND n."isRead" = ${isRead}
        ORDER BY n."createdAt" DESC
      `
    } else if (filterType && filterType !== "all") {
      notifications = await sql`
        SELECT 
          n.*,
          s.name as "senderName",
          s.role as "senderRole"
        FROM "Notification" n
        LEFT JOIN "User" s ON n."senderId" = s.id
        WHERE n."recipientId" = ${user.id}
          AND n."isArchived" = false
          AND n.type = ${filterType}
        ORDER BY n."createdAt" DESC
      `
    } else if (filterRead && filterRead !== "all") {
      const isRead = filterRead === "read"
      notifications = await sql`
        SELECT 
          n.*,
          s.name as "senderName",
          s.role as "senderRole"
        FROM "Notification" n
        LEFT JOIN "User" s ON n."senderId" = s.id
        WHERE n."recipientId" = ${user.id}
          AND n."isArchived" = false
          AND n."isRead" = ${isRead}
        ORDER BY n."createdAt" DESC
      `
    } else {
      notifications = await sql`
        SELECT 
          n.*,
          s.name as "senderName",
          s.role as "senderRole"
        FROM "Notification" n
        LEFT JOIN "User" s ON n."senderId" = s.id
        WHERE n."recipientId" = ${user.id}
          AND n."isArchived" = false
        ORDER BY n."createdAt" DESC
      `
    }

    console.log("[v0] Notifications API: Found", notifications.length, "notifications")

    // Transform to expected format
    const transformed = notifications.map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      location: n.location,
      dealId: n.dealId,
      isRead: n.isRead,
      isArchived: n.isArchived,
      createdAt: n.createdAt,
      sender: n.senderName ? { id: n.senderId, name: n.senderName, role: n.senderRole } : null,
      deal: n.dealId ? { id: n.dealId } : null,
      comments: [], // Comments would need a separate table/query
    }))

    return NextResponse.json({ success: true, data: { notifications: transformed } })
  } catch (error) {
    console.error("[v0] NOTIFICATIONS_GET error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
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

    await sql`
      INSERT INTO "Notification" (
        id, type, title, message, location, "dealId", "senderId", "recipientId", 
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
