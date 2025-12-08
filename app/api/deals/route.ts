import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import crypto from "crypto"

async function getCurrentUser(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    let token = authHeader?.replace("Bearer ", "")

    if (!token) {
      const cookieStore = await cookies()
      token = cookieStore.get("auth-token")?.value
    }

    if (!token) return null

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)

    return {
      id: payload.userId as string,
      role: payload.role as string,
      franchiseeId: payload.franchiseeId as string | null,
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")
    const stage = searchParams.get("stage")
    const pipelineId = searchParams.get("pipelineId")

    let deals: any[]

    if (user.role === "franchisee" || user.role === "admin" || user.role === "employee") {
      if (user.franchiseeId) {
        deals = await sql`
          SELECT 
            d.*,
            u.name as "responsibleName",
            f.name as "franchiseeName",
            f.city as "franchiseeCity"
          FROM "Deal" d
          LEFT JOIN "User" u ON d."responsibleId" = u.id
          LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
          WHERE d."franchiseeId" = ${user.franchiseeId}
          ${pipelineId ? sql`AND d."pipelineId" = ${pipelineId}::uuid` : sql``}
          ${stage ? sql`AND d.stage = ${stage}` : sql``}
          ORDER BY d."createdAt" DESC
        `
      } else {
        deals = await sql`
          SELECT 
            d.*,
            u.name as "responsibleName",
            f.name as "franchiseeName",
            f.city as "franchiseeCity"
          FROM "Deal" d
          LEFT JOIN "User" u ON d."responsibleId" = u.id
          LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
          ${pipelineId ? sql`WHERE d."pipelineId" = ${pipelineId}::uuid` : sql``}
          ${stage && pipelineId ? sql`AND d.stage = ${stage}` : stage ? sql`WHERE d.stage = ${stage}` : sql``}
          ORDER BY d."createdAt" DESC
        `
      }
    } else if (franchiseeId) {
      deals = await sql`
        SELECT 
          d.*,
          u.name as "responsibleName",
          f.name as "franchiseeName",
          f.city as "franchiseeCity"
        FROM "Deal" d
        LEFT JOIN "User" u ON d."responsibleId" = u.id
        LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
        WHERE d."franchiseeId" = ${franchiseeId}
        ${pipelineId ? sql`AND d."pipelineId" = ${pipelineId}::uuid` : sql``}
        ${stage ? sql`AND d.stage = ${stage}` : sql``}
        ORDER BY d."createdAt" DESC
      `
    } else {
      // UK/super_admin - show all deals or filter by pipeline
      deals = await sql`
        SELECT 
          d.*,
          u.name as "responsibleName",
          f.name as "franchiseeName",
          f.city as "franchiseeCity"
        FROM "Deal" d
        LEFT JOIN "User" u ON d."responsibleId" = u.id
        LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
        ${pipelineId ? sql`WHERE d."pipelineId" = ${pipelineId}::uuid` : sql``}
        ${stage && pipelineId ? sql`AND d.stage = ${stage}` : stage ? sql`WHERE d.stage = ${stage}` : sql``}
        ORDER BY d."createdAt" DESC
      `
    }

    const formattedDeals = deals.map((deal: any) => ({
      ...deal,
      responsible: deal.responsibleName ? { id: deal.responsibleId, name: deal.responsibleName } : null,
      franchisee: deal.franchiseeName
        ? {
            id: deal.franchiseeId,
            name: deal.franchiseeName,
            city: deal.franchiseeCity,
          }
        : null,
    }))

    return NextResponse.json({ data: formattedDeals })
  } catch (error: any) {
    console.error("[v0] DEALS_GET error:", error)
    return NextResponse.json({ error: "Failed to fetch deals", details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()

    let franchiseeId: string | null = null

    if (user.role !== "uk" && user.role !== "super_admin") {
      franchiseeId = user.franchiseeId || body.franchiseeId || null

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      if (franchiseeId && !uuidRegex.test(franchiseeId)) {
        const cityName = franchiseeId
        const existingFranchisee = await sql`
          SELECT id FROM "Franchisee" WHERE city = ${cityName} LIMIT 1
        `

        if (existingFranchisee.length > 0) {
          franchiseeId = existingFranchisee[0].id
        } else {
          const newFranchiseeId = crypto.randomUUID()
          const now = new Date().toISOString()
          await sql`
            INSERT INTO "Franchisee" (id, name, city, "createdAt", "updatedAt")
            VALUES (${newFranchiseeId}, ${"Франшиза " + cityName}, ${cityName}, ${now}, ${now})
          `
          franchiseeId = newFranchiseeId
        }
      }
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const locationInfo = body.location ? `Город: ${body.location}` : ""
    const notesWithLocation =
      user.role === "uk" || user.role === "super_admin"
        ? [locationInfo, body.notes || body.description || ""].filter(Boolean).join("\n")
        : body.notes || body.description || null

    await sql`
      INSERT INTO "Deal" (
        id, "clientName", "clientPhone", "clientTelegram",
        source, stage, "stageId", "pipelineId", participants, "gameDate", package,
        price, responsible, "responsibleId", animator, host, dj,
        notes, "franchiseeId", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${body.clientName || null}, ${body.clientPhone || null}, 
        ${body.clientTelegram || body.clientWhatsapp || null},
        ${body.source || null}, ${body.stage || "Новый"}, 
        ${body.stageId ? sql`${body.stageId}::uuid` : sql`NULL`},
        ${body.pipelineId ? sql`${body.pipelineId}::uuid` : sql`NULL`},
        ${body.participants || null},
        ${body.gameDate ? new Date(body.gameDate).toISOString() : null},
        ${body.package || body.packageType || null},
        ${body.price || null}, ${body.responsible || null}, ${body.responsibleId || user.id},
        ${body.animator || null}, ${body.host || null}, ${body.dj || null},
        ${notesWithLocation},
        ${franchiseeId}, ${now}, ${now}
      )
    `

    const [deal] = await sql`SELECT * FROM "Deal" WHERE id = ${id}`

    return NextResponse.json(deal, { status: 201 })
  } catch (error: any) {
    console.error("[v0] DEALS_POST error:", error)
    return NextResponse.json({ error: "Failed to create deal", details: error.message }, { status: 500 })
  }
}
