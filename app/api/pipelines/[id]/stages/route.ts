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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const stages = await sql`
      SELECT * FROM "PipelineStage"
      WHERE "pipelineId" = ${id}::uuid
      ORDER BY "order" ASC
    `

    return NextResponse.json({ data: stages })
  } catch (error) {
    console.error("Error fetching stages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, color, order } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Get max order if not provided
    let stageOrder = order
    if (stageOrder === undefined) {
      const [maxOrder] = await sql`
        SELECT COALESCE(MAX("order"), -1) + 1 as next_order
        FROM "PipelineStage"
        WHERE "pipelineId" = ${id}::uuid
      `
      stageOrder = maxOrder.next_order
    }

    const [stage] = await sql`
      INSERT INTO "PipelineStage" ("pipelineId", name, color, "order")
      VALUES (${id}::uuid, ${name}, ${color || "#6B7280"}, ${stageOrder})
      RETURNING *
    `

    return NextResponse.json({ data: stage })
  } catch (error) {
    console.error("Error creating stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { stages } = body

    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json({ error: "Stages array required" }, { status: 400 })
    }

    // Update all stages order
    for (const stage of stages) {
      await sql`
        UPDATE "PipelineStage"
        SET "order" = ${stage.order}, name = ${stage.name}, color = ${stage.color}
        WHERE id = ${stage.id}::uuid AND "pipelineId" = ${id}::uuid
      `
    }

    const updatedStages = await sql`
      SELECT * FROM "PipelineStage"
      WHERE "pipelineId" = ${id}::uuid
      ORDER BY "order" ASC
    `

    return NextResponse.json({ data: updatedStages })
  } catch (error) {
    console.error("Error updating stages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
