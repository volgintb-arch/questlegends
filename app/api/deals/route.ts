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

    let deals: any[]

    if (user.role === "franchisee" || user.role === "admin" || user.role === "employee") {
      if (user.franchiseeId) {
        if (stage) {
          deals = await sql`
            SELECT 
              d.*,
              u.name as "responsibleName",
              f.name as "franchiseeName",
              f.city as "franchiseeCity"
            FROM "Deal" d
            LEFT JOIN "User" u ON d."responsibleId" = u.id
            LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
            WHERE d."franchiseeId" = ${user.franchiseeId} AND d.stage = ${stage}
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
            WHERE d."franchiseeId" = ${user.franchiseeId}
            ORDER BY d."createdAt" DESC
          `
        }
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
          ORDER BY d."createdAt" DESC
        `
      }
    } else if (franchiseeId) {
      if (stage) {
        deals = await sql`
          SELECT 
            d.*,
            u.name as "responsibleName",
            f.name as "franchiseeName",
            f.city as "franchiseeCity"
          FROM "Deal" d
          LEFT JOIN "User" u ON d."responsibleId" = u.id
          LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
          WHERE d."franchiseeId" = ${franchiseeId} AND d.stage = ${stage}
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
          WHERE d."franchiseeId" = ${franchiseeId}
          ORDER BY d."createdAt" DESC
        `
      }
    } else if (stage) {
      deals = await sql`
        SELECT 
          d.*,
          u.name as "responsibleName",
          f.name as "franchiseeName",
          f.city as "franchiseeCity"
        FROM "Deal" d
        LEFT JOIN "User" u ON d."responsibleId" = u.id
        LEFT JOIN "Franchisee" f ON d."franchiseeId" = f.id
        WHERE d.stage = ${stage}
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
        ORDER BY d."createdAt" DESC
      `
    }

    // Transform to expected format
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

    let franchiseeId = user.franchiseeId || body.franchiseeId

    // If franchiseeId looks like a city name (not a UUID), try to find or create franchisee
    if (franchiseeId && !franchiseeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const cityName = franchiseeId
      // Try to find existing franchisee by city
      const existingFranchisee = await sql`
        SELECT id FROM "Franchisee" WHERE city = ${cityName} LIMIT 1
      `

      if (existingFranchisee.length > 0) {
        franchiseeId = existingFranchisee[0].id
      } else {
        // Create new franchisee for this city
        const newFranchiseeId = crypto.randomUUID()
        const now = new Date().toISOString()
        await sql`
          INSERT INTO "Franchisee" (id, name, city, "createdAt", "updatedAt")
          VALUES (${newFranchiseeId}, ${cityName}, ${cityName}, ${now}, ${now})
        `
        franchiseeId = newFranchiseeId
      }
    }

    // If still no valid franchiseeId, set to null
    if (franchiseeId && !franchiseeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      franchiseeId = null
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await sql`
      INSERT INTO "Deal" (
        id, "clientName", "clientPhone", "clientTelegram",
        source, stage, participants, "gameDate", package,
        price, responsible, "responsibleId", animator, host, dj,
        notes, "franchiseeId", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${body.clientName || null}, ${body.clientPhone || null}, 
        ${body.clientTelegram || body.clientWhatsapp || null},
        ${body.source || null}, ${body.stage || "Лиды"}, 
        ${body.participants || null},
        ${body.gameDate ? new Date(body.gameDate).toISOString() : null},
        ${body.package || body.packageType || null},
        ${body.price || null}, ${body.responsible || null}, ${user.id},
        ${body.animator || null}, ${body.host || null}, ${body.dj || null},
        ${body.notes || body.description || null},
        ${franchiseeId || null}, ${now}, ${now}
      )
    `

    const [deal] = await sql`SELECT * FROM "Deal" WHERE id = ${id}`

    return NextResponse.json(deal, { status: 201 })
  } catch (error: any) {
    console.error("[v0] DEALS_POST error:", error)
    return NextResponse.json({ error: "Failed to create deal", details: error.message }, { status: 500 })
  }
}
