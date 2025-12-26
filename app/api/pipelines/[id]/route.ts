import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const [pipeline] = await sql`
      SELECT p.*, 
        (SELECT json_agg(s ORDER BY s."order") 
         FROM "PipelineStage" s 
         WHERE s."pipelineId" = p.id) as stages
      FROM "Pipeline" p
      WHERE p.id = ${id}::uuid
    `

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    return NextResponse.json({ data: pipeline })
  } catch (error) {
    console.error("Error fetching pipeline:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, color, isDefault } = body

    const [pipeline] = await sql`
      UPDATE "Pipeline"
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        color = COALESCE(${color}, color),
        "isDefault" = COALESCE(${isDefault}, "isDefault"),
        "updatedAt" = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    // If setting as default, unset others
    if (isDefault) {
      await sql`UPDATE "Pipeline" SET "isDefault" = false WHERE id != ${id}::uuid`
    }

    return NextResponse.json({ data: pipeline })
  } catch (error) {
    console.error("Error updating pipeline:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    // Check if pipeline has deals
    const [dealCount] = await sql`
      SELECT COUNT(*) as count FROM "Deal" WHERE "pipelineId" = ${id}::uuid
    `

    if (Number.parseInt(dealCount.count) > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete pipeline with existing deals",
        },
        { status: 400 },
      )
    }

    await sql`DELETE FROM "Pipeline" WHERE id = ${id}::uuid`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting pipeline:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
