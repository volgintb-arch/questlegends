import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

const sql = neon(process.env.DATABASE_URL!)

async function getCurrentUser(request: Request) {
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
      name: payload.name as string,
      role: payload.role as string,
      franchiseeId: payload.franchiseeId as string | null,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pipelineId = searchParams.get("pipelineId")
    const franchiseeId = searchParams.get("franchiseeId")

    let leads
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
    const user = await getCurrentUser(req)

    const body = await req.json()
    const {
      clientName,
      clientPhone,
      clientEmail,
      gameDate,
      gameTime,
      gameDuration = 3, // Added gameDuration field with default 3 hours
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
