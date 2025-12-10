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
            u.name as "responsibleUserName",
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
            u.name as "responsibleUserName",
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
          u.name as "responsibleUserName",
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
      deals = await sql`
        SELECT 
          d.*,
          u.name as "responsibleUserName",
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
      responsible: deal.responsibleUserName ? { id: deal.responsibleId, name: deal.responsibleUserName } : null,
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

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await sql`
      INSERT INTO "Deal" (
        id, 
        "clientName",
        "contactName", 
        "contactPhone", 
        "messengerLink", 
        "city",
        "paushalnyyVznos",
        "investmentAmount",
        "leadSource",
        "responsibleId",
        "additionalComment",
        source, 
        stage, 
        "stageId", 
        "pipelineId",
        "createdAt", 
        "updatedAt"
      ) VALUES (
        ${id}, 
        ${body.contactName || body.clientName || null},
        ${body.contactName || null},
        ${body.contactPhone || null},
        ${body.messengerLink || null},
        ${body.city || null},
        ${body.paushalnyyVznos || null},
        ${body.investmentAmount || null},
        ${body.leadSource || body.source || null},
        ${body.responsibleId || user.id},
        ${body.additionalComment || null},
        ${body.leadSource || body.source || null},
        ${body.stage || "Новый"}, 
        ${body.stageId ? sql`${body.stageId}::uuid` : sql`NULL`},
        ${body.pipelineId ? sql`${body.pipelineId}::uuid` : sql`NULL`},
        ${now}, 
        ${now}
      )
    `

    const [deal] = await sql`SELECT * FROM "Deal" WHERE id = ${id}`

    return NextResponse.json(deal, { status: 201 })
  } catch (error: any) {
    console.error("[v0] DEALS_POST error:", error)
    return NextResponse.json({ error: "Failed to create deal", details: error.message }, { status: 500 })
  }
}
