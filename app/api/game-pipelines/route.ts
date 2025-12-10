import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const franchiseeId = searchParams.get("franchiseeId")

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
    console.error("[v0] Error fetching game pipelines:", error)
    return NextResponse.json({ error: "Failed to fetch pipelines" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, franchiseeId } = body

    if (!name || !franchiseeId) {
      return NextResponse.json({ error: "Name and franchiseeId are required" }, { status: 400 })
    }

    // Create pipeline
    const [pipeline] = await sql`
      INSERT INTO "GamePipeline" (name, "franchiseeId")
      VALUES (${name}, ${franchiseeId})
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
      const [created] = await sql`
        INSERT INTO "GamePipelineStage" ("pipelineId", name, color, "order", "isFixed", "stageType")
        VALUES (${pipeline.id}, ${stage.name}, ${stage.color}, ${stage.order}, ${stage.isFixed}, ${stage.stageType})
        RETURNING *
      `
      stages.push(created)
    }

    pipeline.stages = stages

    return NextResponse.json({ success: true, data: pipeline })
  } catch (error) {
    console.error("[v0] Error creating game pipeline:", error)
    return NextResponse.json({ error: "Failed to create pipeline" }, { status: 500 })
  }
}
