import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  try {
    const { stageId } = await params
    const body = await req.json()

    const updates: string[] = []
    const values: any[] = []

    if (body.name !== undefined) {
      updates.push(`name = $${values.length + 1}`)
      values.push(body.name)
    }
    if (body.color !== undefined) {
      updates.push(`color = $${values.length + 1}`)
      values.push(body.color)
    }

    if (updates.length > 0) {
      values.push(stageId)
      await sql(`UPDATE "GamePipelineStage" SET ${updates.join(", ")} WHERE id = $${values.length}`, values)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating stage:", error)
    return NextResponse.json({ error: "Failed to update stage" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  try {
    const { stageId } = await params

    // Check if stage is fixed
    const [stage] = await sql`SELECT "isFixed" FROM "GamePipelineStage" WHERE id = ${stageId}`
    if (stage?.isFixed) {
      return NextResponse.json({ error: "Cannot delete fixed stage" }, { status: 400 })
    }

    // Check if stage has games
    const games = await sql`SELECT COUNT(*) as count FROM "GameLead" WHERE "stageId" = ${stageId}`
    if (games[0].count > 0) {
      return NextResponse.json({ error: "Cannot delete stage with games" }, { status: 400 })
    }

    await sql`DELETE FROM "GamePipelineStage" WHERE id = ${stageId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting stage:", error)
    return NextResponse.json({ error: "Failed to delete stage" }, { status: 500 })
  }
}
