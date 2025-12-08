import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import * as jose from "jose"

const sql = neon(process.env.DATABASE_URL!)

async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.substring(7)
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "secret")
    const { payload } = await jose.jwtVerify(token, secret)
    return payload as { id: string; role: string; name: string }
  } catch {
    return null
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id, stageId } = await params
    const body = await request.json()
    const { name, color, order } = body

    const [stage] = await sql`
      UPDATE "PipelineStage"
      SET 
        name = COALESCE(${name}, name),
        color = COALESCE(${color}, color),
        "order" = COALESCE(${order}, "order")
      WHERE id = ${stageId}::uuid AND "pipelineId" = ${id}::uuid
      RETURNING *
    `

    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    return NextResponse.json({ data: stage })
  } catch (error) {
    console.error("Error updating stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id, stageId } = await params

    // Check if stage has deals
    const [dealCount] = await sql`
      SELECT COUNT(*) as count FROM "Deal" WHERE "stageId" = ${stageId}::uuid
    `

    if (Number.parseInt(dealCount.count) > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete stage with existing deals. Move deals first.",
        },
        { status: 400 },
      )
    }

    await sql`
      DELETE FROM "PipelineStage" 
      WHERE id = ${stageId}::uuid AND "pipelineId" = ${id}::uuid
    `

    // Reorder remaining stages
    const stages = await sql`
      SELECT id FROM "PipelineStage"
      WHERE "pipelineId" = ${id}::uuid
      ORDER BY "order" ASC
    `

    for (let i = 0; i < stages.length; i++) {
      await sql`
        UPDATE "PipelineStage" SET "order" = ${i} WHERE id = ${stages[i].id}::uuid
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
