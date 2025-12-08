import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const sql = neon(process.env.DATABASE_URL!)

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

    const tasks = await sql`
      SELECT * FROM "DealTask"
      WHERE "dealId" = ${id}
      ORDER BY "createdAt" DESC
    `

    return NextResponse.json({ data: tasks })
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
    const { title, description, assigneeId, assigneeName, deadline } = body

    const [task] = await sql`
      INSERT INTO "DealTask" ("dealId", title, description, "assigneeId", "assigneeName", deadline, "createdById")
      VALUES (${id}, ${title}, ${description || null}, ${assigneeId || null}, ${assigneeName || null}, ${deadline || null}, ${user.id})
      RETURNING *
    `

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
    }

    return NextResponse.json({ data: task })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
