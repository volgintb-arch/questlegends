import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"
import { LeadCreator } from "@/lib/integration-hub/lead-creator"

const sql = neon(process.env.DATABASE_URL!)

// Ensure system pipelines ("Интеграции" and "Архив") exist for a franchisee
async function ensureSystemPipelines(franchiseeId: string) {
  try {
    const existing = await sql`
      SELECT name FROM "GamePipeline" WHERE "franchiseeId" = ${franchiseeId} AND name IN ('Интеграции', 'Архив')
    `
    const existingNames = existing.map((p: any) => p.name)

    if (!existingNames.includes('Интеграции')) {
      const pipelineId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO "GamePipeline" (id, name, "franchiseeId", "createdAt")
        VALUES (${pipelineId}, 'Интеграции', ${franchiseeId}, NOW())
      `
      const stages = [
        { name: "Новый", color: "#3B82F6", order: 0, stageType: "new" },
        { name: "В работе", color: "#F59E0B", order: 1, stageType: "in_progress" },
        { name: "Успешно", color: "#10B981", order: 2, stageType: "won" },
        { name: "Отказ", color: "#EF4444", order: 3, stageType: "lost" },
      ]
      for (const stage of stages) {
        const stageId = globalThis.crypto.randomUUID()
        await sql`
          INSERT INTO "GamePipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType", "createdAt")
          VALUES (${stageId}, ${pipelineId}, ${stage.name}, ${stage.color}, ${stage.order}, true, ${stage.stageType}, NOW())
        `
      }
    }

    if (!existingNames.includes('Архив')) {
      const pipelineId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO "GamePipeline" (id, name, "franchiseeId", "createdAt")
        VALUES (${pipelineId}, 'Архив', ${franchiseeId}, NOW())
      `
      const stageId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO "GamePipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType", "createdAt")
        VALUES (${stageId}, ${pipelineId}, 'Архив', '#6B7280', 0, true, 'archive', NOW())
      `
    }
  } catch (e) {
    console.error("[v0] ensureSystemPipelines error:", e)
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const franchiseeId = searchParams.get("franchiseeId")

    // Ensure system pipelines exist for the franchisee
    if (franchiseeId) {
      await ensureSystemPipelines(franchiseeId)
    }

    let pipelines
    if (franchiseeId) {
      pipelines = await sql`
        SELECT * FROM "GamePipeline"
        WHERE "franchiseeId" = ${franchiseeId}
        ORDER BY "createdAt" ASC
      `
    } else {
      pipelines = await sql`
        SELECT * FROM "GamePipeline"
        ORDER BY "createdAt" ASC
      `
    }

    // Get stages for each pipeline
    for (const pipeline of pipelines) {
      const stages = await sql`
        SELECT * FROM "GamePipelineStage"
        WHERE "pipelineId" = ${pipeline.id}
        ORDER BY "order" ASC
      `
      pipeline.stages = stages
    }

    return NextResponse.json({ success: true, data: pipelines })
  } catch (error) {
    console.error("[v0] Error fetching game pipelines:")
    return NextResponse.json({ error: "Failed to fetch pipelines" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, franchiseeId } = body

    if (!name || !franchiseeId) {
      return NextResponse.json({ error: "Name and franchiseeId are required" }, { status: 400 })
    }

    // Create pipeline (generate ID since Prisma cuid() doesn't work at DB level)
    const pipelineId = globalThis.crypto.randomUUID()
    const [pipeline] = await sql`
      INSERT INTO "GamePipeline" (id, name, "franchiseeId")
      VALUES (${pipelineId}, ${name}, ${franchiseeId})
      RETURNING *
    `

    const defaultStages = [
      { name: "Новая заявка", color: "#6B7280", order: 0, isFixed: false, stageType: null },
      { name: "В работе", color: "#3B82F6", order: 1, isFixed: false, stageType: null },
      { name: "Согласовано", color: "#8B5CF6", order: 2, isFixed: true, stageType: "scheduled" },
      { name: "Завершено", color: "#22C55E", order: 100, isFixed: true, stageType: "completed" },
      { name: "Отказ", color: "#EF4444", order: 101, isFixed: true, stageType: "cancelled" },
    ]

    const stages = []
    for (const stage of defaultStages) {
      const stageId = globalThis.crypto.randomUUID()
      const [created] = await sql`
        INSERT INTO "GamePipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType")
        VALUES (${stageId}, ${pipeline.id}, ${stage.name}, ${stage.color}, ${stage.order}, ${stage.isFixed}, ${stage.stageType || null})
        RETURNING *
      `
      stages.push(created)
    }

    pipeline.stages = stages

    return NextResponse.json({ success: true, data: pipeline })
  } catch (error) {
    console.error("[v0] Error creating game pipeline:")
    return NextResponse.json({ error: "Failed to create pipeline" }, { status: 500 })
  }
}
