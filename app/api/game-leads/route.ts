import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyRequest } from "@/lib/simple-auth"
import { AccessControl } from "@/lib/access-control"
import { AuditLog } from "@/lib/audit-log"

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
    // ?status=completed|scheduled|cancelled — matched against the stage's stageType.
    // The dashboard already sends this; it was silently ignored, so "games" counted every lead.
    const statusParam = searchParams.get("status")
    const status = statusParam && ["completed", "scheduled", "cancelled"].includes(statusParam) ? statusParam : null
    const statusClause = status ? sql`AND s."stageType" = ${status}` : sql``

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
          ${statusClause}
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
          ${statusClause}
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
          WHERE TRUE
          ${statusClause}
          ORDER BY g."createdAt" DESC
          ${status ? sql`` : sql`LIMIT 100`}
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
          ${statusClause}
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
          ${statusClause}
          ORDER BY g."createdAt" DESC
        `
      }
    }

    return NextResponse.json({ success: true, data: leads })
  } catch (error: any) {
    console.error("[v0] Error fetching game leads:")
    const errorMessage = error?.message || String(error)
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
      extras,
      extrasAmount = 0,
    } = body

    if (!clientName || !pipelineId || !stageId || !franchiseeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!access.canAccessFranchisee(franchiseeId)) {
      return NextResponse.json({ error: "Forbidden: no access to this franchisee" }, { status: 403 })
    }

    // The stage must belong to the given pipeline, and the pipeline to the franchisee.
    const [stageCheck] = await sql`
      SELECT s."pipelineId", p."franchiseeId"
      FROM "GamePipelineStage" s JOIN "GamePipeline" p ON p.id = s."pipelineId"
      WHERE s.id = ${stageId}
    `
    if (!stageCheck || stageCheck.pipelineId !== pipelineId) {
      return NextResponse.json({ error: "Этап не принадлежит указанной воронке" }, { status: 400 })
    }
    if (stageCheck.franchiseeId && stageCheck.franchiseeId !== franchiseeId) {
      return NextResponse.json({ error: "Воронка принадлежит другой франшизе" }, { status: 400 })
    }

    const totalAmount = playersCount * pricePerPerson

    const leadId = globalThis.crypto.randomUUID()
    const [lead] = await sql`
      INSERT INTO "GameLead" (
        id, "clientName", "clientPhone", "clientEmail", "gameDate", "gameTime", "gameDuration",
        "playersCount", "pricePerPerson", "totalAmount", "prepayment",
        "notes", "source", "responsibleId", "pipelineId", "stageId", "franchiseeId",
        "animatorsCount", "animatorRate", "hostsCount", "hostRate", "djsCount", "djRate",
        "extras", "extrasAmount",
        "createdAt", "updatedAt"
      )
      VALUES (
        ${leadId}, ${clientName}, ${clientPhone || null}, ${clientEmail || null},
        ${gameDate || null}, ${gameTime || null}, ${gameDuration},
        ${playersCount}, ${pricePerPerson}, ${totalAmount}, ${prepayment},
        ${notes || null}, ${source || null}, ${responsibleId || null},
        ${pipelineId}, ${stageId}, ${franchiseeId},
        ${animatorsCount}, ${animatorRate}, ${hostsCount}, ${hostRate}, ${djsCount}, ${djRate},
        ${extras || null}, ${extrasAmount},
        NOW(), NOW()
      )
      RETURNING *
    `

    // Record the prepayment as a transaction immediately. Previously this only
    // happened when the prepayment field was later edited via PATCH, so a
    // prepayment entered at creation never reached the books: on completion
    // only (total - prepayment) was posted and revenue was understated by the
    // prepayment amount. Mirrors the INSERT in PATCH /api/game-leads/[id].
    const prepaymentAmount = Number(prepayment) || 0
    if (prepaymentAmount > 0) {
      await sql`
        INSERT INTO "Transaction" (
          id, type, amount, category, description, "franchiseeId", "gameLeadId", date, "createdAt"
        ) VALUES (
          ${globalThis.crypto.randomUUID()},
          'income',
          ${prepaymentAmount},
          'prepayment',
          ${"Предоплата за игру: " + clientName},
          ${franchiseeId},
          ${lead.id},
          ${gameDate || new Date().toISOString().split("T")[0]},
          NOW()
        )
      `
    }

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

    return NextResponse.json({ success: true, data: lead })
  } catch (error) {
    console.error("[v0] Error creating game lead:", error)
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 })
  }
}
