import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"
import crypto from "crypto"
import { logApiError } from "@/lib/app-logger"

async function getCurrentUser(request: NextRequest) {
  const payload = await verifyRequest(request)
  if (!payload) return null
  return {
    id: payload.userId as string,
    role: payload.role as string,
    name: payload.name as string || "",
    franchiseeId: payload.franchiseeId as string | null,
  }
}

async function logDealAction(
  sql: ReturnType<typeof neon>,
  dealId: string,
  action: string,
  userId: string,
  userName: string,
  details?: {
    fromStageId?: string
    toStageId?: string
    fromStageName?: string
    toStageName?: string
    pipelineId?: string
    pipelineName?: string
    extraDetails?: string
  },
) {
  try {
    const logId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "DealLog" (id, "dealId", action, "fromStageId", "toStageId", "fromStageName", "toStageName", "pipelineId", "pipelineName", details, "userId", "userName")
      VALUES (
        ${logId},
        ${dealId},
        ${action},
        ${details?.fromStageId || null},
        ${details?.toStageId || null},
        ${details?.fromStageName || null},
        ${details?.toStageName || null},
        ${details?.pipelineId || null},
        ${details?.pipelineName || null},
        ${details?.extraDetails || null},
        ${userId},
        ${userName}
      )
    `
  } catch (error) {
    console.error("Error logging deal action:")
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
        f.city as "franchiseeCity",
        u.name as "responsibleUserName"
      FROM "Deal" d
      LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
      LEFT JOIN "User" u ON d."responsibleId" = u.id
      WHERE d.id = ${id}
    `

    if (deals.length === 0) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }

    const deal = deals[0]

    // H3: Cross-tenant check — non-UK roles can only access their own franchisee's deals
    if (!["uk", "super_admin", "uk_employee"].includes(user.role)) {
      if (deal.franchiseeId && user.franchiseeId && deal.franchiseeId !== user.franchiseeId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json({
      success: true,
      ...deal,
      responsibleName: deal.responsibleUserName,
      franchisee: {
        id: deal.franchiseeId,
        name: deal.franchiseeName,
        city: deal.franchiseeCity,
      },
    })
  } catch (error) {
    console.error("[v0] DEAL_GET error:", error)
    logApiError(error, request).catch(() => {})
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

    // H3: Cross-tenant check for PATCH
    if (!["uk", "super_admin", "uk_employee"].includes(user.role) && user.franchiseeId) {
      const [dealCheck] = await sql`SELECT "franchiseeId" FROM "Deal" WHERE id = ${id}`
      if (dealCheck && dealCheck.franchiseeId && dealCheck.franchiseeId !== user.franchiseeId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
      }
    }

    if (body.stage !== undefined) {
      // Get old stage info for logging
      const [oldDeal] = await sql`
        SELECT d."stageId", d."pipelineId", s.name as "oldStageName", p.name as "pipelineName"
        FROM "Deal" d
        LEFT JOIN "PipelineStage" s ON d."stageId" = s.id
        LEFT JOIN "Pipeline" p ON d."pipelineId" = p.id
        WHERE d.id = ${id}
      `

      if (body.stageId) {
        // Get new stage info
        const [newStage] = await sql`SELECT name FROM "PipelineStage" WHERE id = ${body.stageId}`

        await sql`
          UPDATE "Deal"
          SET "stage" = ${body.stage}, "stageId" = ${body.stageId}, "updatedAt" = NOW()
          WHERE id = ${id}
        `

        // Stamp lifecycle timestamps when stage changes (для трекинга конверсий по yclid)
        const [stageMeta] = await sql`SELECT "stageType" FROM "PipelineStage" WHERE id = ${body.stageId}`
        const stType = stageMeta?.stageType
        if (stType === "scheduled") {
          await sql`UPDATE "Deal" SET "scheduledAt" = COALESCE("scheduledAt", NOW()) WHERE id = ${id}`
        } else if (stType === "completed" || stType === "won") {
          await sql`UPDATE "Deal" SET "completedAt" = COALESCE("completedAt", NOW()) WHERE id = ${id}`
        } else if (stType === "cancelled" || stType === "lost") {
          await sql`UPDATE "Deal" SET "cancelledAt" = COALESCE("cancelledAt", NOW()) WHERE id = ${id}`
        }

        // Log the movement
        await logDealAction(sql, id, "move", user.id, user.name, {
          fromStageId: oldDeal?.stageId,
          toStageId: body.stageId,
          fromStageName: oldDeal?.oldStageName,
          toStageName: newStage?.name || body.stage,
          pipelineId: oldDeal?.pipelineId,
          pipelineName: oldDeal?.pipelineName,
        })
      } else {
        await sql`UPDATE "Deal" SET "stage" = ${body.stage}, "updatedAt" = NOW() WHERE id = ${id}`
      }

      const updated = await sql`SELECT * FROM "Deal" WHERE id = ${id}`
      if (updated.length === 0) {
        return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, data: updated[0] })
    }

    const changedFields: string[] = []

    // Contact fields
    if (body.contactName !== undefined) {
      await sql`UPDATE "Deal" SET "contactName" = ${body.contactName}, "clientName" = ${body.contactName}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("contactName")
    }
    if (body.contactPhone !== undefined) {
      await sql`UPDATE "Deal" SET "contactPhone" = ${body.contactPhone}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("contactPhone")
    }
    if (body.messengerLink !== undefined) {
      await sql`UPDATE "Deal" SET "messengerLink" = ${body.messengerLink}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("messengerLink")
    }
    if (body.city !== undefined) {
      await sql`UPDATE "Deal" SET "city" = ${body.city}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("city")
    }

    // Deal fields
    if (body.paushalnyyVznos !== undefined) {
      await sql`UPDATE "Deal" SET "paushalnyyVznos" = ${body.paushalnyyVznos}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("paushalnyyVznos")
    }
    if (body.investmentAmount !== undefined) {
      await sql`UPDATE "Deal" SET "investmentAmount" = ${body.investmentAmount}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("investmentAmount")
    }
    if (body.leadSource !== undefined) {
      await sql`UPDATE "Deal" SET "leadSource" = ${body.leadSource}, "source" = ${body.leadSource}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("leadSource")
    }
    if (body.additionalComment !== undefined) {
      await sql`UPDATE "Deal" SET "additionalComment" = ${body.additionalComment}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("additionalComment")
    }

    // Legacy fields
    if (body.clientName !== undefined) {
      await sql`UPDATE "Deal" SET "clientName" = ${body.clientName}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("clientName")
    }
    if (body.clientPhone !== undefined) {
      await sql`UPDATE "Deal" SET "clientPhone" = ${body.clientPhone}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("clientPhone")
    }
    if (body.price !== undefined) {
      await sql`UPDATE "Deal" SET "price" = ${body.price}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("price")
    }
    if (body.participants !== undefined) {
      await sql`UPDATE "Deal" SET "participants" = ${body.participants}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("participants")
    }
    if (body.notes !== undefined) {
      await sql`UPDATE "Deal" SET "notes" = ${body.notes}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("notes")
    }
    if (body.pipelineId !== undefined) {
      await sql`UPDATE "Deal" SET "pipelineId" = ${body.pipelineId}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("pipelineId")
    }
    if (body.cancellationReason !== undefined) {
      await sql`UPDATE "Deal" SET "cancellationReason" = ${body.cancellationReason || null}, "updatedAt" = NOW() WHERE id = ${id}`
      changedFields.push("cancellationReason")
    }

    // Log field changes if any
    if (changedFields.length > 0) {
      await logDealAction(sql, id, "update", user.id, user.name, {
        extraDetails: `Изменены поля: ${changedFields.join(", ")}`,
      })
    }

    // Handle responsible change with notification
    if (body.responsibleId !== undefined) {
      await sql`UPDATE "Deal" SET "responsibleId" = ${body.responsibleId}, "updatedAt" = NOW() WHERE id = ${id}`

      if (body.responsibleId) {
        const notifId = crypto.randomUUID()
        const now = new Date().toISOString()

        const deals = await sql`SELECT "clientName", "contactName" FROM "Deal" WHERE id = ${id}`
        const dealName = deals[0]?.contactName || deals[0]?.clientName || "Сделка"

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
    logApiError(error, request).catch(() => {})
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

    const [deal] = await sql`SELECT "contactName", "clientName", "pipelineId" FROM "Deal" WHERE id = ${id}`
    const dealName = deal?.contactName || deal?.clientName || "Сделка"

    await logDealAction(sql, id, "delete", user.id, user.name, {
      pipelineId: deal?.pipelineId,
      extraDetails: `Удалена сделка: ${dealName}`,
    })

    await sql`DELETE FROM "Deal" WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] DEAL_DELETE error:", error)
    logApiError(error, request).catch(() => {})
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
