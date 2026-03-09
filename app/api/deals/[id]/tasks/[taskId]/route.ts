import { neon } from "@/lib/neon-compat"
import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, taskId } = await params
    const body = await request.json()
    const status = body.status || (body.completed ? "completed" : "pending")
    const isCompleted = status === "completed"

    const [task] = await sql`
      UPDATE "DealTask"
      SET status = ${status}, "isCompleted" = ${isCompleted}
      WHERE id = ${taskId} AND "dealId" = ${id}
      RETURNING *
    `

    // Create event for task completion
    if (isCompleted) {
      await sql`
        INSERT INTO "DealEvent" ("dealId", type, content, "userId", "userName", metadata)
        VALUES (${id}, 'task_completed', ${`Задача выполнена: ${task.title}`}, ${user.userId}, ${user.name}, ${JSON.stringify({ taskId })})
      `
    }

    return NextResponse.json({ data: task })
  } catch (error) {
    console.error("Error updating task:")
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, taskId } = await params

    // Get task info before delete
    const [task] = await sql`
      SELECT title FROM "DealTask" WHERE id = ${taskId}
    `

    await sql`
      DELETE FROM "DealTask"
      WHERE id = ${taskId} AND "dealId" = ${id}
    `

    // Create delete event
    if (task) {
      await sql`
        INSERT INTO "DealEvent" ("dealId", type, content, "userId", "userName", metadata)
        VALUES (${id}, 'task_deleted', ${`Удалена задача: ${task.title}`}, ${user.userId}, ${user.name}, ${JSON.stringify({ taskId })})
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting task:")
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
