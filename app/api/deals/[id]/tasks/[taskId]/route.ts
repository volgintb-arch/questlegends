import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || "secret") as any
    return decoded
  } catch {
    return null
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const user = getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, taskId } = await params
    const body = await request.json()
    const { completed } = body

    const [task] = await sql`
      UPDATE "DealTask"
      SET completed = ${completed}, "updatedAt" = NOW()
      WHERE id = ${taskId}::uuid AND "dealId" = ${id}
      RETURNING *
    `

    // Create event for task completion
    if (completed) {
      await sql`
        INSERT INTO "DealEvent" ("dealId", type, content, "userId", "userName", metadata)
        VALUES (${id}, 'task_completed', ${`Задача выполнена: ${task.title}`}, ${user.id}, ${user.name}, ${JSON.stringify({ taskId })})
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
    const user = getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, taskId } = await params

    await sql`
      DELETE FROM "DealTask"
      WHERE id = ${taskId}::uuid AND "dealId" = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
