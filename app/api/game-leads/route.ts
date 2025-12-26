import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyToken } from "@/lib/simple-auth"
import { AccessControl } from "@/lib/access-control"
import { AuditLog } from "@/lib/audit-log"

export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = new AccessControl(user)
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
      const userFranchiseeId = user.franchisee_id || franchiseeId
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
    const errorMessage = error?.message || String(error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leads",
        message: errorMessage,
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = new AccessControl(user)
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
    } = body

    if (!clientName || !pipelineId || !stageId || !franchiseeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!access.canAccessFranchisee(franchiseeId)) {
      return NextResponse.json({ error: "Forbidden: no access to this franchisee" }, { status: 403 })
    }

    const totalAmount = playersCount * pricePerPerson

    const [lead] = await sql`
      INSERT INTO "GameLead" (
        "clientName", "clientPhone", "clientEmail", "gameDate", "gameTime", "gameDuration",
        "playersCount", "pricePerPerson", "totalAmount", "prepayment",
        "notes", "source", "responsibleId", "pipelineId", "stageId", "franchiseeId",
        "animatorsCount", "animatorRate", "hostsCount", "hostRate", "djsCount", "djRate"
      )
      VALUES (
        ${clientName}, ${clientPhone || null}, ${clientEmail || null}, 
        ${gameDate || null}, ${gameTime || null}, ${gameDuration},
        ${playersCount}, ${pricePerPerson}, ${totalAmount}, ${prepayment},
        ${notes || null}, ${source || null}, ${responsibleId || null}, 
        ${pipelineId}, ${stageId}, ${franchiseeId},
        ${animatorsCount}, ${animatorRate}, ${hostsCount}, ${hostRate}, ${djsCount}, ${djRate}
      )
      RETURNING *
    `

    const [stage] = await sql`SELECT name FROM "GamePipelineStage" WHERE id = ${stageId}`

    await sql`
      INSERT INTO "GameLeadLog" ("leadId", action, "toStageId", "toStageName", "pipelineId", details, "userId", "userName")
      VALUES (${lead.id}, 'create', ${stageId}, ${stage?.name || ""}, ${pipelineId}, ${"Создана заявка: " + clientName}, ${user?.id || null}, ${user?.name || null})
    `

    await sql`
      INSERT INTO "GameLeadEvent" ("leadId", type, content, "userId", "userName")
      VALUES (${lead.id}, 'system', 'Заявка создана', ${user?.id || null}, ${user?.name || null})
    `

    await AuditLog.log({
      user_id: user.id,
      action: "lead_created",
      resource_type: "game_lead",
      resource_id: lead.id,
      details: { clientName, franchiseeId, source },
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
    })

    if (responsibleId && responsibleId !== user?.id) {
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
          ${user?.id || null},
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
    return NextResponse.json({ error: "Failed to create lead", details: String(error) }, { status: 500 })
  }
}
