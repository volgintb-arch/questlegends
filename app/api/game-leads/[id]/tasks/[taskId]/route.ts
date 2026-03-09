import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const { id, taskId } = await params
    const body = await req.json()
    const user = await verifyRequest(req)

    const [task] = await sql`SELECT * FROM "GameLeadTask" WHERE id = ${taskId} AND "leadId" = ${id}`
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Update task status
    if (body.completed !== undefined) {
      const newStatus = body.completed ? "completed" : "pending"
      await sql`UPDATE "GameLeadTask" SET status = ${newStatus} WHERE id = ${taskId}`

      // Log event
      const statusEventId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO "GameLeadEvent" (id, "leadId", type, content, "userId", "userName")
        VALUES (${statusEventId}, ${id}, 'system', ${body.completed ? "Задача завершена: " + task.title : "Задача открыта заново: " + task.title}, ${user?.userId || null}, ${user?.name || null})
      `
    }

    // Update other fields
    if (body.title !== undefined) {
      await sql`UPDATE "GameLeadTask" SET title = ${body.title} WHERE id = ${taskId}`
    }
    if (body.description !== undefined) {
      await sql`UPDATE "GameLeadTask" SET description = ${body.description || null} WHERE id = ${taskId}`
    }
    if (body.deadline !== undefined) {
      const deadlineValue = body.deadline && body.deadline !== "" ? body.deadline : null
      await sql`UPDATE "GameLeadTask" SET deadline = ${deadlineValue} WHERE id = ${taskId}`
    }
    if (body.assigneeId !== undefined) {
      await sql`UPDATE "GameLeadTask" SET "assigneeId" = ${body.assigneeId || null} WHERE id = ${taskId}`
    }

    const [updatedTask] = await sql`SELECT * FROM "GameLeadTask" WHERE id = ${taskId}`
    return NextResponse.json({ success: true, data: updatedTask })
  } catch (error) {
    console.error("[v0] Error updating task:")
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const { id, taskId } = await params
    const user = await verifyRequest(req)

    const [task] = await sql`SELECT * FROM "GameLeadTask" WHERE id = ${taskId} AND "leadId" = ${id}`
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    await sql`DELETE FROM "GameLeadTask" WHERE id = ${taskId}`

    const deleteEventId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "GameLeadEvent" (id, "leadId", type, content, "userId", "userName")
      VALUES (${deleteEventId}, ${id}, 'system', ${"Задача удалена: " + task.title}, ${user?.userId || null}, ${user?.name || null})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting task:")
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
