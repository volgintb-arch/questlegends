import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const tasks = await sql`
      SELECT t.*, u.name as "assigneeName"
      FROM "GameLeadTask" t
      LEFT JOIN "User" u ON t."assigneeId" = u.id
      WHERE t."leadId" = ${id}
      ORDER BY t."createdAt" DESC
    `

    return NextResponse.json({ success: true, data: tasks })
  } catch (error) {
    console.error("[v0] Error fetching tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyRequest(req)
    const body = await req.json()
    const { title, description, assigneeId, deadline } = body

    const deadlineValue = deadline && deadline !== "" ? deadline : null

    let assigneeName = null
    let recipientId = assigneeId || user?.userId // If no assignee specified, task is for creator

    if (assigneeId) {
      const [assignee] = await sql`SELECT name FROM "User" WHERE id = ${assigneeId}`
      assigneeName = assignee?.name || null
    } else if (user) {
      // Task is self-assigned
      assigneeName = user.name
      recipientId = user.userId
    }

    const [task] = await sql`
      INSERT INTO "GameLeadTask" ("leadId", title, description, "assigneeId", "assigneeName", deadline, "createdById")
      VALUES (${id}, ${title}, ${description || null}, ${recipientId}, ${assigneeName}, ${deadlineValue}, ${user?.userId || null})
      RETURNING *
    `

    await sql`
      INSERT INTO "GameLeadEvent" ("leadId", type, content, "userId", "userName")
      VALUES (${id}, 'task', ${"Создана задача: " + title + (assigneeName ? " (исполнитель: " + assigneeName + ")" : "")}, ${user?.userId || null}, ${user?.name || null})
    `

    const [gameLead] = await sql`SELECT "clientName", "franchiseeId" FROM "GameLead" WHERE id = ${id}`
    const notificationId = globalThis.crypto.randomUUID()
    const now = new Date().toISOString()

    // Create notification for the assignee (including self)
    if (recipientId) {
      const isSelfAssigned = recipientId === user?.userId
      const notificationTitle = isSelfAssigned ? "Новая задача (для себя)" : "Новая задача"
      const notificationMessage = isSelfAssigned
        ? `Вы создали задачу: ${title} (клиент: ${gameLead?.clientName || "Неизвестно"})`
        : `Вам назначена задача: ${title} (клиент: ${gameLead?.clientName || "Неизвестно"})`

      await sql`
        INSERT INTO "Notification" (
          id, type, title, message, "senderId", "recipientId", "relatedDealId", "relatedTaskId",
          "isRead", "isArchived", "createdAt", "updatedAt"
        )
        VALUES (
          ${notificationId}, 
          'task', 
          ${notificationTitle}, 
          ${notificationMessage},
          ${user?.userId || null},
          ${recipientId},
          ${id},
          ${task.id},
          false,
          false,
          ${now},
          ${now}
        )
      `
    }

    return NextResponse.json({ success: true, data: task })
  } catch (error) {
    console.error("[v0] Error creating task:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
