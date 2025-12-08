import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

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

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ transactions: [] })
    }

    const sql = neon(process.env.DATABASE_URL)
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    let transactions

    if (user.role === "franchisee" || user.role === "admin") {
      // Franchisee/admin sees only their transactions
      if (user.franchiseeId) {
        transactions = await sql`
          SELECT t.*, 
            d.id as "dealId", d."clientName" as "dealTitle", d."clientName",
            f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Transaction" t
          LEFT JOIN "Deal" d ON t."dealId" = d.id
          LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
          WHERE t."franchiseeId" = ${user.franchiseeId}
          ORDER BY t.date DESC
          LIMIT 100
        `
      } else {
        transactions = []
      }
    } else {
      // UK sees all or filtered by franchiseeId
      if (franchiseeId) {
        transactions = await sql`
          SELECT t.*, 
            d.id as "dealId", d."clientName" as "dealTitle", d."clientName",
            f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Transaction" t
          LEFT JOIN "Deal" d ON t."dealId" = d.id
          LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
          WHERE t."franchiseeId" = ${franchiseeId}
          ORDER BY t.date DESC
          LIMIT 100
        `
      } else {
        transactions = await sql`
          SELECT t.*, 
            d.id as "dealId", d."clientName" as "dealTitle", d."clientName",
            f.id as "franchiseeId", f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Transaction" t
          LEFT JOIN "Deal" d ON t."dealId" = d.id
          LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
          ORDER BY t.date DESC
          LIMIT 100
        `
      }
    }

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error("[v0] TRANSACTIONS_GET error:", error)
    return NextResponse.json({ transactions: [] })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)
    const body = await request.json()

    const { dealId, franchiseeId, type, amount, description, date } = body

    const actualFranchiseeId = franchiseeId || user.franchiseeId

    const result = await sql`
      INSERT INTO "Transaction" (
        id, "dealId", "franchiseeId", type, amount, description, date, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        ${dealId || null},
        ${actualFranchiseeId},
        ${type || "income"},
        ${amount || 0},
        ${description || ""},
        ${date ? new Date(date).toISOString() : new Date().toISOString()},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] TRANSACTIONS_POST error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
