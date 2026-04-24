import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const [pipeline] = await sql`SELECT * FROM "GamePipeline" WHERE id = ${id}`
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    if (pipeline.name === "Архив") {
      return NextResponse.json({ error: "Нельзя переименовать воронку Архив" }, { status: 400 })
    }

    if (body.name !== undefined) {
      const trimmed = String(body.name).trim()
      if (!trimmed) {
        return NextResponse.json({ error: "Название не может быть пустым" }, { status: 400 })
      }
      await sql`UPDATE "GamePipeline" SET name = ${trimmed} WHERE id = ${id}`
    }

    const [updated] = await sql`SELECT * FROM "GamePipeline" WHERE id = ${id}`
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Error updating game pipeline:", error)
    return NextResponse.json({ error: "Failed to update pipeline" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Get pipeline info
    const [pipeline] = await sql`SELECT * FROM "GamePipeline" WHERE id = ${id}`
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    // Don't allow deleting the Archive pipeline
    if (pipeline.name === "Архив") {
      return NextResponse.json({ error: "Нельзя удалить воронку Архив" }, { status: 400 })
    }

    // Check if pipeline has leads
    const leads = await sql`SELECT COUNT(*) as count FROM "GameLead" WHERE "pipelineId" = ${id}`

    if (Number(leads[0].count) > 0) {
      // Find or create Archive pipeline for this franchisee
      let [archive] = await sql`
        SELECT * FROM "GamePipeline" WHERE "franchiseeId" = ${pipeline.franchiseeId} AND name = 'Архив'
      `

      if (!archive) {
        const archiveId = globalThis.crypto.randomUUID()
        const [created] = await sql`
          INSERT INTO "GamePipeline" (id, name, "franchiseeId", "createdAt")
          VALUES (${archiveId}, 'Архив', ${pipeline.franchiseeId}, NOW())
          RETURNING *
        `
        archive = created

        // Create default stage for archive
        const stageId = globalThis.crypto.randomUUID()
        await sql`
          INSERT INTO "GamePipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType", "createdAt")
          VALUES (${stageId}, ${archiveId}, 'Архив', '#6B7280', 0, true, 'archive', NOW())
        `
      }

      // Get the archive stage
      const [archiveStage] = await sql`
        SELECT id FROM "GamePipelineStage" WHERE "pipelineId" = ${archive.id} ORDER BY "order" LIMIT 1
      `

      if (archiveStage) {
        // Move all leads to archive
        await sql`
          UPDATE "GameLead"
          SET "pipelineId" = ${archive.id}, "stageId" = ${archiveStage.id}, "updatedAt" = NOW()
          WHERE "pipelineId" = ${id}
        `
      }
    }

    // Delete stages, then pipeline
    await sql`DELETE FROM "GamePipelineStage" WHERE "pipelineId" = ${id}`
    await sql`DELETE FROM "GamePipeline" WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting game pipeline:")
    return NextResponse.json({ error: "Failed to delete pipeline" }, { status: 500 })
  }
}
