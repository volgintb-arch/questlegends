import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
    console.error("Error fetching pipelines:", error)
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

    // Create pipeline
    const [pipeline] = await sql`
      INSERT INTO "Pipeline" (name, description, color, "createdById")
      VALUES (${name}, ${description || null}, ${color || "#3B82F6"}, ${user.userId})
      RETURNING *
    `

    const defaultStages = stages || [
      { name: "Новый", color: "#6B7280", order: 0, isFixed: false, stageType: null },
      { name: "В работе", color: "#3B82F6", order: 1, isFixed: false, stageType: null },
    ]

    // Add user-provided stages
    for (const stage of defaultStages) {
      await sql`
        INSERT INTO "PipelineStage" ("pipelineId", name, color, "order", "isFixed", "stageType")
        VALUES (${pipeline.id}, ${stage.name}, ${stage.color || "#6B7280"}, ${stage.order}, ${stage.isFixed || false}, ${stage.stageType || null})
      `
    }

    // Always add fixed stages at the end
    const lastOrder = defaultStages.length
    await sql`
      INSERT INTO "PipelineStage" ("pipelineId", name, color, "order", "isFixed", "stageType")
      VALUES (${pipeline.id}, 'Завершен', '#22C55E', ${lastOrder}, true, 'completed')
    `
    await sql`
      INSERT INTO "PipelineStage" ("pipelineId", name, color, "order", "isFixed", "stageType")
      VALUES (${pipeline.id}, 'Отказ', '#EF4444', ${lastOrder + 1}, true, 'cancelled')
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
    console.error("Error creating pipeline:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
