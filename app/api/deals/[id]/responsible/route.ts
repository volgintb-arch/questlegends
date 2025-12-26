import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"
import crypto from "crypto"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dealId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    const responsibles = await sql`
      SELECT dr."userId", u.name as "userName"
      FROM "DealResponsible" dr
      LEFT JOIN "User" u ON dr."userId" = u.id
      WHERE dr."dealId" = ${dealId}
    `

    return NextResponse.json({
      responsibleIds: responsibles.map((r) => r.userId),
      responsibles: responsibles,
    })
  } catch (error) {
    console.error("[v0] Error fetching responsible users:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dealId } = await params
    const body = await request.json()
    const { responsibleIds } = body

    const sql = neon(process.env.DATABASE_URL!)

    // Delete existing assignments
    await sql`DELETE FROM "DealResponsible" WHERE "dealId" = ${dealId}`

    // Insert new assignments
    for (const odp of responsibleIds) {
      const id = crypto.randomUUID()
      await sql`
        INSERT INTO "DealResponsible" (id, "dealId", "userId")
        VALUES (${id}, ${dealId}, ${odp})
      `

      // Send notification to new responsible user
      const notifId = crypto.randomUUID()
      const now = new Date().toISOString()
      const [deal] = await sql`SELECT "contactName", "clientName" FROM "Deal" WHERE id = ${dealId}`
      const dealName = deal?.contactName || deal?.clientName || "Сделка"

      await sql`
        INSERT INTO "Notification" (
          id, type, title, message, "senderId", "recipientId",
          "relatedDealId", "isRead", "isArchived", "createdAt", "updatedAt"
        ) VALUES (
          ${notifId}, 'deal', 'Назначение ответственным',
          ${`Вы назначены ответственным по сделке "${dealName}"`},
          ${user.userId}, ${odp}, ${dealId}, false, false, ${now}, ${now}
        )
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating responsible users:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
