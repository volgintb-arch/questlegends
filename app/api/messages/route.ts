import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const payload = verifyToken(token)
    if (!payload) return null

    return {
      id: payload.userId as string,
      role: payload.role as string,
      name: payload.name as string,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get("partnerId")

    if (partnerId) {
      // Get conversation with specific user
      const messages = await sql`
        SELECT 
          m.*,
          s.name as "senderName",
          r.name as "receiverName"
        FROM "Message" m
        LEFT JOIN "User" s ON m."senderId" = s.id
        LEFT JOIN "User" r ON m."receiverId" = r.id
        WHERE (m."senderId" = ${user.id} AND m."receiverId" = ${partnerId})
           OR (m."senderId" = ${partnerId} AND m."receiverId" = ${user.id})
        ORDER BY m."createdAt" ASC
      `

      // Mark messages as read
      await sql`
        UPDATE "Message" 
        SET "isRead" = true 
        WHERE "senderId" = ${partnerId} AND "receiverId" = ${user.id} AND "isRead" = false
      `

      return NextResponse.json({ data: messages })
    } else {
      // Get all conversations (list of unique chat partners)
      const conversations = await sql`
        WITH LatestMessages AS (
          SELECT DISTINCT ON (partner_id) *
          FROM (
            SELECT 
              m.*,
              CASE 
                WHEN m."senderId" = ${user.id} THEN m."receiverId"
                ELSE m."senderId"
              END as partner_id
            FROM "Message" m
            WHERE m."senderId" = ${user.id} OR m."receiverId" = ${user.id}
          ) sub
          ORDER BY partner_id, "createdAt" DESC
        )
        SELECT 
          lm.*,
          u.name as "partnerName",
          u.role as "partnerRole",
          (
            SELECT COUNT(*) FROM "Message" 
            WHERE "senderId" = lm.partner_id 
              AND "receiverId" = ${user.id} 
              AND "isRead" = false
          ) as "unreadCount"
        FROM LatestMessages lm
        LEFT JOIN "User" u ON lm.partner_id = u.id
        ORDER BY lm."createdAt" DESC
      `

      return NextResponse.json({ data: conversations })
    }
  } catch (error) {
    console.error("[v0] Messages GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { receiverId, content, fileUrl, fileName } = body

    if (!receiverId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const id = globalThis.crypto.randomUUID()
    const now = new Date().toISOString()

    await sql`
      INSERT INTO "Message" (id, "senderId", "receiverId", content, "fileUrl", "fileName", "isRead", "createdAt")
      VALUES (${id}, ${user.id}, ${receiverId}, ${content}, ${fileUrl || null}, ${fileName || null}, false, ${now})
    `

    // Create notification for receiver
    const notifId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "Notification" (id, type, title, message, "senderId", "recipientId", "isRead", "isArchived", "createdAt", "updatedAt")
      VALUES (
        ${notifId}, 
        'message', 
        'Новое сообщение', 
        ${`У вас новое сообщение от ${user.name}`},
        ${user.id},
        ${receiverId},
        false,
        false,
        ${now},
        ${now}
      )
    `

    return NextResponse.json({
      data: {
        id,
        senderId: user.id,
        receiverId,
        content,
        fileUrl,
        fileName,
        isRead: false,
        createdAt: now,
      },
    })
  } catch (error) {
    console.error("[v0] Messages POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get("partnerId")

    if (!partnerId) {
      return NextResponse.json({ error: "Missing partnerId" }, { status: 400 })
    }

    // Delete all messages in conversation
    await sql`
      DELETE FROM "Message"
      WHERE (("senderId" = ${user.id} AND "receiverId" = ${partnerId})
         OR ("senderId" = ${partnerId} AND "receiverId" = ${user.id}))
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Messages DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
