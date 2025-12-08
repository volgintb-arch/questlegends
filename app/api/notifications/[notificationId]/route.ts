import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

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
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notificationId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    const notifications = await sql`
      SELECT 
        n.*,
        s.name as "senderName",
        s.role as "senderRole"
      FROM "Notification" n
      LEFT JOIN "User" s ON n."senderId" = s.id
      WHERE n.id = ${notificationId} AND n."recipientId" = ${user.id}
    `

    if (notifications.length === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: notifications[0] })
  } catch (error) {
    console.error("[v0] NOTIFICATION_GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notificationId } = await params
    const body = await request.json()
    const { isRead, isArchived } = body

    const sql = neon(process.env.DATABASE_URL!)

    if (typeof isRead === "boolean") {
      await sql`
        UPDATE "Notification" 
        SET "isRead" = ${isRead}, "updatedAt" = NOW() 
        WHERE id = ${notificationId} AND "recipientId" = ${user.id}
      `
    }

    if (typeof isArchived === "boolean") {
      await sql`
        UPDATE "Notification" 
        SET "isArchived" = ${isArchived}, "updatedAt" = NOW() 
        WHERE id = ${notificationId} AND "recipientId" = ${user.id}
      `
    }

    const result = await sql`
      SELECT * FROM "Notification" 
      WHERE id = ${notificationId} AND "recipientId" = ${user.id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error) {
    console.error("[v0] NOTIFICATION_PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notificationId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    await sql`
      DELETE FROM "Notification" 
      WHERE id = ${notificationId} AND "recipientId" = ${user.id}
    `

    return NextResponse.json({ success: true, message: "Notification deleted" })
  } catch (error) {
    console.error("[v0] NOTIFICATION_DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
