import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sql = neon(process.env.DATABASE_URL!)

    const tasks = await sql`
      SELECT t.*, u.name as "assigneeName"
      FROM "DealTask" t
      LEFT JOIN "User" u ON t."assigneeId" = u.id
      WHERE t."dealId" = ${id}
      ORDER BY t."createdAt" DESC
    `

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, assigneeId, deadline } = body

    console.log("[v0] Creating task:", { title, assigneeId, deadline })

    const sql = neon(process.env.DATABASE_URL!)

    let assigneeName = null
    if (assigneeId) {
      const assignees = await sql`SELECT name FROM "User" WHERE id = ${assigneeId}`
      assigneeName = assignees[0]?.name || null
    }

    const [task] = await sql`
      INSERT INTO "DealTask" ("dealId", title, description, "assigneeId", deadline, "createdById")
      VALUES (${id}, ${title}, ${description || null}, ${assigneeId || null}, ${deadline || null}, ${user.id})
      RETURNING *
    `

    console.log("[v0] Task created:", task.id)

    // Create event for task creation
    await sql`
      INSERT INTO "DealEvent" ("dealId", type, content, "userId", "userName", metadata)
      VALUES (${id}, 'task', ${`Создана задача: ${title}`}, ${user.id}, ${user.name}, ${JSON.stringify({ taskId: task.id })})
    `

    if (assigneeId) {
      const notifId = crypto.randomUUID()
      const now = new Date().toISOString()

      // Get deal info for notification
      const deals = await sql`SELECT "clientName" FROM "Deal" WHERE id = ${id}`
      const dealName = deals[0]?.clientName || "Сделка"

      await sql`
        INSERT INTO "Notification" (
          id, type, title, message, "senderId", "recipientId", 
          "relatedDealId", "relatedTaskId", "isRead", "isArchived", "createdAt", "updatedAt"
        ) VALUES (
          ${notifId}, 'task', 'Новая задача', 
          ${`Вам назначена задача "${title}" по сделке "${dealName}"`},
          ${user.id}, ${assigneeId}, ${id}, ${task.id}, false, false, ${now}, ${now}
        )
      `
      console.log("[v0] Notification created for assignee:", assigneeId)
    }

    return NextResponse.json({ data: { ...task, assigneeName }, success: true })
  } catch (error: any) {
    console.error("[v0] Error creating task:", error.message)
    return NextResponse.json({ error: "Failed to create task", details: error.message }, { status: 500 })
  }
}
