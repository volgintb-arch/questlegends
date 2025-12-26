import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const sql = neon(process.env.DATABASE_URL!)

    // Only allow deleting own messages
    const message = await sql`
      SELECT * FROM "Message" WHERE id = ${id} AND "senderId" = ${user.userId}
    `

    if (message.length === 0) {
      return NextResponse.json({ error: "Message not found or not authorized" }, { status: 404 })
    }

    await sql`DELETE FROM "Message" WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting message:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const { content } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Only allow editing own messages
    const message = await sql`
      SELECT * FROM "Message" WHERE id = ${id} AND "senderId" = ${user.userId}
    `

    if (message.length === 0) {
      return NextResponse.json({ error: "Message not found or not authorized" }, { status: 404 })
    }

    await sql`
      UPDATE "Message" 
      SET content = ${content}, "isEdited" = true, "updatedAt" = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error editing message:", String(error))
    return NextResponse.json(
      { error: "Internal error", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
