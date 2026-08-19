import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyRequest } from "@/lib/simple-auth"
import { AccessControl } from "@/lib/access-control"
import { AuditLog } from "@/lib/audit-log"
import { logApiError } from "@/lib/app-logger"
import { emitGamesWebhook, emitBookingWebhook } from "@/lib/seeker-webhook-emitter"
import { allocateActivationCode } from "@/lib/activation-code"

export async function GET(req: NextRequest) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = new AccessControl({ id: user.userId, role: user.role, franchiseeId: user.franchiseeId })
    if (!access.canAccessModule("crm")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const pipelineId = searchParams.get("pipelineId")
    const franchiseeId = searchParams.get("franchiseeId")

    let leads

    if (access.isUKStaff()) {
      // УК видит все лиды
      if (pipelineId) {
        leads = await sql`
          SELECT g.*, 
            u.name as "responsibleName",
            s.name as "stageName",
            s."stageType" as "stageType"
          FROM "GameLead" g
          LEFT JOIN "User" u ON g."responsibleId" = u.id
          LEFT JOIN "GamePipelineStage" s ON g."stageId" = s.id
          WHERE g."pipelineId" = ${pipelineId}
          ORDER BY g."createdAt" DESC
        `
      } else if (franchiseeId) {
        leads = await sql`
          SELECT g.*, 
            u.name as "responsibleName",
            s.name as "stageName",
            s."stageType" as "stageType"
          FROM "GameLead" g
          LEFT JOIN "User" u ON g."responsibleId" = u.id
          LEFT JOIN "GamePipelineStage" s ON g."stageId" = s.id
          WHERE g."franchiseeId" = ${franchiseeId}
          ORDER BY g."createdAt" DESC
        `
      } else {
        leads = await sql`
          SELECT g.*, 
            u.name as "responsibleName",
            s.name as "stageName",
            s."stageType" as "stageType"
          FROM "GameLead" g
          LEFT JOIN "User" u ON g."responsibleId" = u.id
          LEFT JOIN "GamePipelineStage" s ON g."stageId" = s.id
          ORDER BY g."createdAt" DESC
          LIMIT 100
        `
      }
    } else {
      // Франчайзи видит только свои лиды
      const userFranchiseeId = user.franchiseeId || franchiseeId
      if (!userFranchiseeId) {
        return NextResponse.json({ success: true, data: [] })
      }

      if (pipelineId) {
        leads = await sql`
          SELECT g.*, 
            u.name as "responsibleName",
            s.name as "stageName",
            s."stageType" as "stageType"
          FROM "GameLead" g
          LEFT JOIN "User" u ON g."responsibleId" = u.id
          LEFT JOIN "GamePipelineStage" s ON g."stageId" = s.id
          WHERE g."pipelineId" = ${pipelineId}
          AND g."franchiseeId" = ${userFranchiseeId}
          ORDER BY g."createdAt" DESC
        `
      } else {
        leads = await sql`
          SELECT g.*, 
            u.name as "responsibleName",
            s.name as "stageName",
            s."stageType" as "stageType"
          FROM "GameLead" g
          LEFT JOIN "User" u ON g."responsibleId" = u.id
          LEFT JOIN "GamePipelineStage" s ON g."stageId" = s.id
          WHERE g."franchiseeId" = ${userFranchiseeId}
          ORDER BY g."createdAt" DESC
        `
      }
    }

    return NextResponse.json({ success: true, data: leads })
  } catch (error: any) {
    console.error("[v0] Error fetching game leads:", error)
    logApiError(error, req).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leads",
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = new AccessControl({ id: user.userId, role: user.role, franchiseeId: user.franchiseeId })
    if (!access.canPerformAction("leads", "create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const {
      clientName,
      clientPhone,
      clientEmail,
      gameDate,
      gameTime,
      gameDuration = 3,
      playersCount = 1,
      pricePerPerson = 1500,
      prepayment = 0,
      notes,
      source,
      responsibleId,
      pipelineId,
      stageId,
      franchiseeId,
      animatorsCount = 0,
      animatorRate = 1500,
      hostsCount = 0,
      hostRate = 2000,
      djsCount = 0,
      djRate = 2500,
      extraStaffCount = 0,
      extraStaffRate = 0,
      discount = 0,
      refCode,
      extras,
      extrasAmount = 0,
      paymentMethod,
      yclid,
      gclid,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referrer,
    } = body

    // Validate gameDate: not earlier than 3 months ago
    if (gameDate) {
      const minDate = new Date()
      minDate.setMonth(minDate.getMonth() - 3)
      if (new Date(gameDate) < minDate) {
        return NextResponse.json({ error: "Дата игры не может быть раньше чем 3 месяца назад" }, { status: 400 })
      }
    }

    if (!clientName || !pipelineId || !stageId || !franchiseeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!access.canAccessFranchisee(franchiseeId)) {
      return NextResponse.json({ error: "Forbidden: no access to this franchisee" }, { status: 403 })
    }

    const totalAmount = Math.max(0, playersCount * pricePerPerson - (discount || 0))

    const leadId = globalThis.crypto.randomUUID()
    const [lead] = await sql`
      INSERT INTO "GameLead" (
        id, "clientName", "clientPhone", "clientEmail", "gameDate", "gameTime", "gameDuration",
        "playersCount", "pricePerPerson", "totalAmount", "prepayment",
        "notes", "source", "responsibleId", "pipelineId", "stageId", "franchiseeId",
        "animatorsCount", "animatorRate", "hostsCount", "hostRate", "djsCount", "djRate",
        "extraStaffCount", "extraStaffRate",
        "discount",
        "refCode",
        "extras", "extrasAmount", "paymentMethod",
        "yclid", "gclid", "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "referrer",
        "createdAt", "updatedAt"
      )
      VALUES (
        ${leadId}, ${clientName}, ${clientPhone || null}, ${clientEmail || null},
        ${gameDate || null}, ${gameTime || null}, ${gameDuration},
        ${playersCount}, ${pricePerPerson}, ${totalAmount}, ${prepayment},
        ${notes || null}, ${source || null}, ${responsibleId || null},
        ${pipelineId}, ${stageId}, ${franchiseeId},
        ${animatorsCount}, ${animatorRate}, ${hostsCount}, ${hostRate}, ${djsCount}, ${djRate},
        ${extraStaffCount}, ${extraStaffRate},
        ${discount},
        ${refCode || null},
        ${extras || null}, ${extrasAmount}, ${paymentMethod || "cash"},
        ${yclid || null}, ${gclid || null}, ${utmSource || null}, ${utmMedium || null}, ${utmCampaign || null}, ${utmContent || null}, ${utmTerm || null}, ${referrer || null},
        NOW(), NOW()
      )
      RETURNING *
    `

    const [stage] = await sql`SELECT name FROM "GamePipelineStage" WHERE id = ${stageId}`

    const logId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "GameLeadLog" (id, "leadId", action, "toStageId", "toStageName", "pipelineId", details, "userId", "userName", "franchiseeId", "clientName")
      VALUES (${logId}, ${lead.id}, 'create', ${stageId}, ${stage?.name || ""}, ${pipelineId}, ${"Создана заявка: " + clientName}, ${user.userId || null}, ${user.name || null}, ${franchiseeId || null}, ${clientName || null})
    `

    const eventId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "GameLeadEvent" (id, "leadId", type, content, "userId", "userName")
      VALUES (${eventId}, ${lead.id}, 'system', 'Заявка создана', ${user.userId || null}, ${user.name || null})
    `

    await AuditLog.log({
      userId: user.userId,
      userName: user.name,
      userRole: user.role,
      action: "lead_created",
      entityType: "lead",
      entityId: lead.id,
      franchiseeId: franchiseeId || null,
      details: { clientName, source },
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    })

    if (responsibleId && responsibleId !== user.userId) {
      const notificationId = globalThis.crypto.randomUUID()
      const now = new Date().toISOString()

      await sql`
        INSERT INTO "Notification" (
          id, type, title, message, "senderId", "recipientId", "relatedDealId",
          "isRead", "isArchived", "createdAt", "updatedAt"
        )
        VALUES (
          ${notificationId}, 
          'deal', 
          'Новая заявка', 
          ${"Вы назначены ответственным за новую заявку: " + clientName},
          ${user.userId || null},
          ${responsibleId},
          ${lead.id},
          false,
          false,
          ${now},
          ${now}
        )
      `
    }

    // D-011: если лид создан сразу в стадии Согласовано или Завершено — выделить код.
    // Обычный сценарий — создание в "Новый", но защищаемся от прямого создания в поздней стадии.
    const [initialStage] = await sql`SELECT "stageType" FROM "GamePipelineStage" WHERE id = ${stageId}`
    if (initialStage?.stageType === "scheduled" || initialStage?.stageType === "completed") {
      try {
        const code = await allocateActivationCode(sql as any)
        await sql`UPDATE "GameLead" SET "activationCode" = ${code} WHERE id = ${lead.id}`
      } catch (err) {
        console.error("[game-leads/POST] activation code alloc failed:", err)
      }
    }

    // Fire-and-forget вебхуки в seeker-passport. Ошибки логируются внутри
    // emit-функций в AppLog — seeker fallback-крон подтянет пропущенное.
    void emitGamesWebhook(lead.id).catch(() => {})
    if (refCode) {
      void emitBookingWebhook(lead.id, String(refCode)).catch(() => {})
    }

    return NextResponse.json({ success: true, data: lead })
  } catch (error) {
    console.error("[v0] Error creating game lead:", error)
    logApiError(error, req).catch(() => {})
    return NextResponse.json({ error: "Failed to create lead", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
