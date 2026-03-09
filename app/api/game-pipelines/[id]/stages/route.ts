import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, color } = body

    // Get max order excluding fixed stages
    const maxOrder = await sql`
      SELECT COALESCE(MAX("order"), -1) as max FROM "GamePipelineStage" 
      WHERE "pipelineId" = ${id} AND ("isFixed" = false OR "isFixed" IS NULL)
    `
    const order = (maxOrder[0].max || 0) + 1

    const stageId = globalThis.crypto.randomUUID()
    const [stage] = await sql`
      INSERT INTO "GamePipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType")
      VALUES (${stageId}, ${id}, ${name}, ${color || "#6B7280"}, ${order}, false, null)
      RETURNING *
    `

    return NextResponse.json({ success: true, data: stage })
  } catch (error) {
    console.error("[v0] Error creating stage:")
    return NextResponse.json({ error: "Failed to create stage" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { stages } = body

    for (const stage of stages) {
      await sql`
        UPDATE "GamePipelineStage" 
        SET "order" = ${stage.order}
        WHERE id = ${stage.id} AND "pipelineId" = ${id}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating stages order:")
    return NextResponse.json({ error: "Failed to update stages" }, { status: 500 })
  }
}
