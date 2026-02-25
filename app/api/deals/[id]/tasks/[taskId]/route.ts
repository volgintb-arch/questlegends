import { neon } from "@neondatabase/serverless"
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
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    console.log("[v0] Delete task API called")
    const user = await verifyRequest(request)
    if (!user) {
      console.log("[v0] Delete task - unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, taskId } = await params
    console.log("[v0] Deleting task:", taskId, "from deal:", id)

    // Get task info before delete
    const [task] = await sql`
      SELECT title FROM "DealTask" WHERE id = ${taskId}::uuid
    `

    await sql`
      DELETE FROM "DealTask"
      WHERE id = ${taskId}::uuid AND "dealId" = ${id}
    `

    // Create delete event
    if (task) {
      await sql`
        INSERT INTO "DealEvent" ("dealId", type, content, "userId", "userName", metadata)
        VALUES (${id}, 'task_deleted', ${`Удалена задача: ${task.title}`}, ${user.userId}, ${user.name}, ${JSON.stringify({ taskId })})
      `
    }

    console.log("[v0] Task deleted successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting task:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
