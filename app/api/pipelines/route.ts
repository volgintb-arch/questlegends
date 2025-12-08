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

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
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
    const user = await verifyAuth(request)
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
      VALUES (${name}, ${description || null}, ${color || "#3B82F6"}, ${user.id})
      RETURNING *
    `

    // Create default stages if none provided
    const defaultStages = stages || [
      { name: "Новый", color: "#6B7280", order: 0 },
      { name: "В работе", color: "#3B82F6", order: 1 },
      { name: "Завершен", color: "#22C55E", order: 2 },
    ]

    for (const stage of defaultStages) {
      await sql`
        INSERT INTO "PipelineStage" ("pipelineId", name, color, "order")
        VALUES (${pipeline.id}, ${stage.name}, ${stage.color || "#6B7280"}, ${stage.order})
      `
    }

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
