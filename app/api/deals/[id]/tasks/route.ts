import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import crypto from "crypto"

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  try {
    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.userId as string,
      name: payload.name as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dealId } = params
    const sql = neon(process.env.DATABASE_URL!)

    const tasks = await sql`
      SELECT t.*, u.name as "assigneeName"
      FROM "DealTask" t
      LEFT JOIN "User" u ON t."assigneeId" = u.id
      WHERE t."dealId" = ${dealId}
      ORDER BY t."createdAt" DESC
    `

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dealId } = params
    const body = await request.json()
    const { title, description, assigneeId, deadline } = body

    console.log("[v0] Creating task:", { dealId, title, assigneeId, deadline })

    const sql = neon(process.env.DATABASE_URL!)

    const taskId = crypto.randomUUID()
    const now = new Date().toISOString()
    const deadlineValue = deadline ? new Date(deadline).toISOString() : null

    // Get assignee name if assigneeId provided
    let assigneeName = null
    if (assigneeId) {
      const assignees = await sql`SELECT name FROM "User" WHERE id = ${assigneeId}`
      assigneeName = assignees[0]?.name || null
    }

    const [task] = await sql`
      INSERT INTO "DealTask" (id, "dealId", title, description, "assigneeId", deadline, status, "createdAt")
      VALUES (${taskId}, ${dealId}, ${title}, ${description || null}, ${assigneeId || null}, ${deadlineValue}, 'pending', ${now})
      RETURNING *
    `

    console.log("[v0] Task created:", task.id)

    // Create event for task creation
    await sql`
      INSERT INTO "DealEvent" ("dealId", type, content, "userId", "userName", metadata)
      VALUES (${dealId}, 'task', ${`Создана задача: ${title}`}, ${user.id}, ${user.name}, ${JSON.stringify({ taskId: task.id })})
    `

    if (assigneeId) {
      const notifId = crypto.randomUUID()

      const deals = await sql`SELECT "clientName", "contactName" FROM "Deal" WHERE id = ${dealId}`
      const dealName = deals[0]?.contactName || deals[0]?.clientName || "Сделка"

      await sql`
        INSERT INTO "Notification" (
          id, type, title, message, "senderId", "recipientId", 
          "relatedDealId", "relatedTaskId", "isRead", "isArchived", "createdAt", "updatedAt"
        ) VALUES (
          ${notifId}, 'task', 'Новая задача', 
          ${`Вам назначена задача "${title}" по сделке "${dealName}"`},
          ${user.id}, ${assigneeId}, ${dealId}, ${task.id}, false, false, ${now}, ${now}
        )
      `
      console.log("[v0] Notification created for assignee:", assigneeId)
    }

    return NextResponse.json({
      data: { ...task, assigneeName },
      success: true,
    })
  } catch (error: any) {
    console.error("[v0] Error creating task:", error.message)
    return NextResponse.json({ error: "Failed to create task", details: error.message }, { status: 500 })
  }
}
