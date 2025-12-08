import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"
import crypto from "crypto"

async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.userId as string,
      role: payload.role as string,
      name: payload.name as string,
      franchiseeId: payload.franchiseeId as string | null,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const sql = neon(process.env.DATABASE_URL!)
    const deals = await sql`
      SELECT 
        d.*,
        f.name as "franchiseeName",
        f.city as "franchiseeCity"
      FROM "Deal" d
      LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
      WHERE d.id = ${id}
    `

    if (deals.length === 0) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }

    const deal = deals[0]

    return NextResponse.json({
      success: true,
      ...deal,
      franchisee: {
        id: deal.franchiseeId,
        name: deal.franchiseeName,
        city: deal.franchiseeCity,
      },
    })
  } catch (error) {
    console.error("[v0] DEAL_GET error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const sql = neon(process.env.DATABASE_URL!)

    if (body.stage !== undefined) {
      if (body.stageId) {
        await sql`
          UPDATE "Deal" 
          SET "stage" = ${body.stage}, "stageId" = ${body.stageId}::uuid, "updatedAt" = NOW() 
          WHERE id = ${id}
        `
      } else {
        await sql`UPDATE "Deal" SET "stage" = ${body.stage}, "updatedAt" = NOW() WHERE id = ${id}`
      }

      const updated = await sql`SELECT * FROM "Deal" WHERE id = ${id}`
      if (updated.length === 0) {
        return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, data: updated[0] })
    }

    // Handle other fields
    if (body.clientName !== undefined) {
      await sql`UPDATE "Deal" SET "clientName" = ${body.clientName}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.clientPhone !== undefined) {
      await sql`UPDATE "Deal" SET "clientPhone" = ${body.clientPhone}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.price !== undefined) {
      await sql`UPDATE "Deal" SET "price" = ${body.price}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.participants !== undefined) {
      await sql`UPDATE "Deal" SET "participants" = ${body.participants}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.notes !== undefined) {
      await sql`UPDATE "Deal" SET "notes" = ${body.notes}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.pipelineId !== undefined) {
      await sql`UPDATE "Deal" SET "pipelineId" = ${body.pipelineId}::uuid, "updatedAt" = NOW() WHERE id = ${id}`
    }

    if (body.responsible !== undefined) {
      await sql`UPDATE "Deal" SET "responsible" = ${body.responsible}, "updatedAt" = NOW() WHERE id = ${id}`

      if (body.responsible && body.responsibleId) {
        const notifId = crypto.randomUUID()
        const now = new Date().toISOString()

        const deals = await sql`SELECT "clientName" FROM "Deal" WHERE id = ${id}`
        const dealName = deals[0]?.clientName || "Сделка"

        await sql`
          INSERT INTO "Notification" (
            id, type, title, message, "senderId", "recipientId", 
            "relatedDealId", "isRead", "isArchived", "createdAt", "updatedAt"
          ) VALUES (
            ${notifId}, 'deal', 'Назначение ответственным', 
            ${`Вы назначены ответственным по сделке "${dealName}"`},
            ${user.id}, ${body.responsibleId}, ${id}, false, false, ${now}, ${now}
          )
        `
      }
    }

    const result = await sql`SELECT * FROM "Deal" WHERE id = ${id}`

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error) {
    console.error("[v0] DEAL_PATCH error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "uk" && user.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const sql = neon(process.env.DATABASE_URL!)
    await sql`DELETE FROM "Deal" WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] DEAL_DELETE error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
