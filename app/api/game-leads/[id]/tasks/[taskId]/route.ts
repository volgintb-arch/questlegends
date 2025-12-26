import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(req: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  try {
    const { id, taskId } = params
    const body = await req.json()
    const user = await verifyRequest(req)

    const [task] = await sql`SELECT * FROM "GameLeadTask" WHERE id = ${taskId} AND "leadId" = ${id}`
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Update task status
    if (body.completed !== undefined) {
      const newStatus = body.completed ? "completed" : "pending"
      await sql`UPDATE "GameLeadTask" SET status = ${newStatus}, "updatedAt" = NOW() WHERE id = ${taskId}`

      // Log event
      await sql`
        INSERT INTO "GameLeadEvent" ("leadId", type, content, "userId", "userName")
        VALUES (${id}, 'system', ${body.completed ? "Задача завершена: " + task.title : "Задача открыта заново: " + task.title}, ${user?.userId || null}, ${user?.name || null})
      `
    }

    // Update other fields
    if (body.title !== undefined) {
      await sql`UPDATE "GameLeadTask" SET title = ${body.title}, "updatedAt" = NOW() WHERE id = ${taskId}`
    }
    if (body.description !== undefined) {
      await sql`UPDATE "GameLeadTask" SET description = ${body.description || null}, "updatedAt" = NOW() WHERE id = ${taskId}`
    }
    if (body.deadline !== undefined) {
      const deadlineValue = body.deadline && body.deadline !== "" ? body.deadline : null
      await sql`UPDATE "GameLeadTask" SET deadline = ${deadlineValue}, "updatedAt" = NOW() WHERE id = ${taskId}`
    }
    if (body.assigneeId !== undefined) {
      await sql`UPDATE "GameLeadTask" SET "assigneeId" = ${body.assigneeId || null}, "updatedAt" = NOW() WHERE id = ${taskId}`
    }

    const [updatedTask] = await sql`SELECT * FROM "GameLeadTask" WHERE id = ${taskId}`
    return NextResponse.json({ success: true, data: updatedTask })
  } catch (error) {
    console.error("[v0] Error updating task:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  try {
    const { id, taskId } = params
    const user = await verifyRequest(req)

    const [task] = await sql`SELECT * FROM "GameLeadTask" WHERE id = ${taskId} AND "leadId" = ${id}`
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    await sql`DELETE FROM "GameLeadTask" WHERE id = ${taskId}`

    await sql`
      INSERT INTO "GameLeadEvent" ("leadId", type, content, "userId", "userName")
      VALUES (${id}, 'system', ${"Задача удалена: " + task.title}, ${user?.userId || null}, ${user?.name || null})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting task:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
