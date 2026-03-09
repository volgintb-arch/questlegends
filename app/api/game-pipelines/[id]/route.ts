import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if pipeline has games
    const games = await sql`SELECT COUNT(*) as count FROM "GameLead" WHERE "pipelineId" = ${id}`
    if (games[0].count > 0) {
      return NextResponse.json({ error: "Cannot delete pipeline with games" }, { status: 400 })
    }

    // Delete stages first
    await sql`DELETE FROM "GamePipelineStage" WHERE "pipelineId" = ${id}`

    // Delete pipeline
    await sql`DELETE FROM "GamePipeline" WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting game pipeline:")
    return NextResponse.json({ error: "Failed to delete pipeline" }, { status: 500 })
  }
}
