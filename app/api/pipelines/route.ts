import { neon } from "@/lib/neon-compat"
import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

// Ensure system pipelines ("Интеграции" and "Архив") exist for B2B
async function ensureB2BSystemPipelines() {
  try {
    const existing = await sql`
      SELECT name FROM "Pipeline" WHERE name IN ('Интеграции', 'Архив')
    `
    const existingNames = existing.map((p: any) => p.name)

    if (!existingNames.includes('Интеграции')) {
      const pipelineId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO "Pipeline" (id, name, description, color, "isDefault", "createdAt")
        VALUES (${pipelineId}, 'Интеграции', 'Лиды из интеграций', '#8B5CF6', false, NOW())
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
          INSERT INTO "PipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType", "createdAt")
          VALUES (${stageId}, ${pipelineId}, ${stage.name}, ${stage.color}, ${stage.order}, true, ${stage.stageType}, NOW())
        `
      }
    }

    if (!existingNames.includes('Архив')) {
      const pipelineId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO "Pipeline" (id, name, description, color, "isDefault", "createdAt")
        VALUES (${pipelineId}, 'Архив', 'Архивированные лиды', '#6B7280', false, NOW())
      `
      const stageId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO "PipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType", "createdAt")
        VALUES (${stageId}, ${pipelineId}, 'Архив', '#6B7280', 0, true, 'archive', NOW())
      `
    }
  } catch (e) {
    console.error("[v0] ensureB2BSystemPipelines error:", e)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure system pipelines exist
    await ensureB2BSystemPipelines()

    const pipelines = await sql`
      SELECT p.*,
        (SELECT json_agg(s ORDER BY s."order")
         FROM "PipelineStage" s
         WHERE s."pipelineId" = p.id) as stages
      FROM "Pipeline" p
      ORDER BY p."isDefault" DESC, p."createdAt" ASC
    `

    return NextResponse.json({ data: pipelines })
  } catch (error) {
    console.error("Error fetching pipelines:")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, color, stages } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Create pipeline (generate ID since Prisma cuid() doesn't work at DB level)
    const pipelineId = globalThis.crypto.randomUUID()
    const [pipeline] = await sql`
      INSERT INTO "Pipeline" (id, name, description, color, "createdById")
      VALUES (${pipelineId}, ${name}, ${description || null}, ${color || "#3B82F6"}, ${user.userId})
      RETURNING *
    `

    const defaultStages = stages || [
      { name: "Новый", color: "#6B7280", order: 0, isFixed: false, stageType: null },
      { name: "В работе", color: "#3B82F6", order: 1, isFixed: false, stageType: null },
    ]

    // Add user-provided stages
    for (const stage of defaultStages) {
      const stageId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO "PipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType")
        VALUES (${stageId}, ${pipeline.id}, ${stage.name}, ${stage.color || "#6B7280"}, ${stage.order}, ${stage.isFixed || false}, ${stage.stageType || null})
      `
    }

    // Always add fixed stages at the end
    const lastOrder = defaultStages.length
    const completedStageId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "PipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType")
      VALUES (${completedStageId}, ${pipeline.id}, 'Завершен', '#22C55E', ${lastOrder}, true, 'completed')
    `
    const cancelledStageId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "PipelineStage" (id, "pipelineId", name, color, "order", "isFixed", "stageType")
      VALUES (${cancelledStageId}, ${pipeline.id}, 'Отказ', '#EF4444', ${lastOrder + 1}, true, 'cancelled')
    `

    // Fetch pipeline with stages
    const [result] = await sql`
      SELECT p.*, 
        (SELECT json_agg(s ORDER BY s."order") 
         FROM "PipelineStage" s 
         WHERE s."pipelineId" = p.id) as stages
      FROM "Pipeline" p
      WHERE p.id = ${pipeline.id}
    `

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("Error creating pipeline:")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
