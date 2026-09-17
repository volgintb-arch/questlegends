import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"
import { canAccessFranchisee } from "@/lib/tenant"

const sql = neon(process.env.DATABASE_URL!)

/** 403 unless the caller may access the lead that owns these tasks. */
async function assertLeadAccess(user: { role: string; franchiseeId?: string | null }, leadId: string) {
  const [lead] = await sql`SELECT "franchiseeId" FROM "GameLead" WHERE id = ${leadId}`
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  if (!canAccessFranchisee(user, lead.franchiseeId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }
  return null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const denied = await assertLeadAccess(user, id)
    if (denied) return denied

    const tasks = await sql`
      SELECT t.*, u.name as "assigneeName"
      FROM "GameLeadTask" t
      LEFT JOIN "User" u ON t."assigneeId" = u.id
      WHERE t."leadId" = ${id}
      ORDER BY t."createdAt" DESC
    `

    return NextResponse.json({ success: true, data: tasks })
  } catch (error) {
    console.error("[v0] Error fetching tasks:")
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const denied = await assertLeadAccess(user, id)
    if (denied) return denied
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

    const gameLeadTaskId = globalThis.crypto.randomUUID()
    const [task] = await sql`
      INSERT INTO "GameLeadTask" (id, "leadId", title, description, "assigneeId", "assigneeName", deadline, "createdById")
      VALUES (${gameLeadTaskId}, ${id}, ${title}, ${description || null}, ${recipientId}, ${assigneeName}, ${deadlineValue}, ${user?.userId || null})
      RETURNING *
    `

    const gameLeadEventId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "GameLeadEvent" (id, "leadId", type, content, "userId", "userName")
      VALUES (${gameLeadEventId}, ${id}, 'task', ${"Создана задача: " + title + (assigneeName ? " (исполнитель: " + assigneeName + ")" : "")}, ${user?.userId || null}, ${user?.name || null})
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
    console.error("[v0] Error creating task:")
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
