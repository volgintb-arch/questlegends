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
    const { pipelineId } = await req.json()

    if (!pipelineId) {
      return NextResponse.json({ error: "pipelineId is required" }, { status: 400 })
    }

    // Get current lead
    const [lead] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Access check
    const ukRoles = ["uk", "super_admin", "uk_employee"]
    if (!ukRoles.includes(user.role) && lead.franchiseeId !== user.franchiseeId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get target pipeline
    const [targetPipeline] = await sql`SELECT * FROM "GamePipeline" WHERE id = ${pipelineId}`
    if (!targetPipeline) {
      return NextResponse.json({ error: "Target pipeline not found" }, { status: 404 })
    }

    // Must be same franchisee
    if (targetPipeline.franchiseeId !== lead.franchiseeId) {
      return NextResponse.json({ error: "Cannot move to another franchisee's pipeline" }, { status: 400 })
    }

    // Get first stage of target pipeline
    const [firstStage] = await sql`
      SELECT id FROM "GamePipelineStage"
      WHERE "pipelineId" = ${pipelineId}
      ORDER BY "order" ASC
      LIMIT 1
    `
    if (!firstStage) {
      return NextResponse.json({ error: "Target pipeline has no stages" }, { status: 400 })
    }

    // Get old pipeline name for log
    const [oldPipeline] = await sql`SELECT name FROM "GamePipeline" WHERE id = ${lead.pipelineId}`

    // Move lead
    await sql`
      UPDATE "GameLead"
      SET "pipelineId" = ${pipelineId}, "stageId" = ${firstStage.id}, "updatedAt" = NOW()
      WHERE id = ${id}
    `

    // Log the move
    const logId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "GameLeadLog" (id, "leadId", action, details, "pipelineId", "userId", "userName", "franchiseeId", "clientName")
      VALUES (
        ${logId}, ${id}, 'pipeline_move',
        ${"Перемещение из «" + (oldPipeline?.name || "—") + "» в «" + targetPipeline.name + "»"},
        ${pipelineId}, ${user.userId || null}, ${user.name || null}, ${lead.franchiseeId || null}, ${lead.clientName || null}
      )
    `

    return NextResponse.json({ success: true, stageId: firstStage.id })
  } catch (error) {
    console.error("[v0] Error moving game lead:")
    return NextResponse.json({ error: "Failed to move lead" }, { status: 500 })
  }
}
