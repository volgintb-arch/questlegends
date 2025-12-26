import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/simple-auth"

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)
  if (!payload) return null

  return {
    id: payload.userId as string,
    role: payload.role as string,
    franchiseeId: payload.franchiseeId as string | null,
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ transactions: [], data: [] })
    }

    const sql = neon(process.env.DATABASE_URL)
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    if (franchiseeId) {
      // Franchisee/own_point/admin sees only their transactions
      if (user.role === "franchisee" || user.role === "own_point" || user.role === "admin") {
        if (user.franchiseeId) {
          const transactions = await sql`
            SELECT t.id, t.type, t.amount, t.description, t.category, t.date, t."createdAt",
              t."dealId", t."franchiseeId", t."gameLeadId",
              d."clientName" as "dealTitle",
              f.name as "franchiseeName", f.city as "franchiseeCity"
            FROM "Transaction" t
            LEFT JOIN "Deal" d ON t."dealId" = d.id
            LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
            WHERE t."franchiseeId" = ${user.franchiseeId}
            ORDER BY t.date DESC
            LIMIT 100
          `
          return NextResponse.json({ transactions, data: transactions })
        } else {
          return NextResponse.json({ transactions: [], data: [] })
        }
      } else if (user.role === "uk_employee") {
        const transactions = await sql`
          SELECT t.id, t.type, t.amount, t.description, t.category, t.date, t."createdAt",
            t."dealId", t."franchiseeId", t."gameLeadId",
            d."clientName" as "dealTitle",
            f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Transaction" t
          LEFT JOIN "Deal" d ON t."dealId" = d.id
          LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
          INNER JOIN "UserFranchiseeAssignment" ufa ON t."franchiseeId" = ufa."franchiseeId"
          WHERE ufa."userId" = ${user.id} AND t."franchiseeId" = ${franchiseeId}
          ORDER BY t.date DESC
          LIMIT 100
        `
        return NextResponse.json({ transactions, data: transactions })
      } else {
        // UK/super_admin sees all or filtered by franchiseeId
        const transactions = await sql`
          SELECT t.id, t.type, t.amount, t.description, t.category, t.date, t."createdAt",
            t."dealId", t."franchiseeId", t."gameLeadId",
            d."clientName" as "dealTitle",
            f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Transaction" t
          LEFT JOIN "Deal" d ON t."dealId" = d.id
          LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
          WHERE t."franchiseeId" = ${franchiseeId}
          ORDER BY t.date DESC
          LIMIT 100
        `
        return NextResponse.json({ transactions, data: transactions })
      }
    } else {
      if (user.role === "franchisee" || user.role === "own_point" || user.role === "admin") {
        if (user.franchiseeId) {
          const transactions = await sql`
            SELECT t.id, t.type, t.amount, t.description, t.category, t.date, t."createdAt",
              t."dealId", t."franchiseeId", t."gameLeadId",
              d."clientName" as "dealTitle",
              f.name as "franchiseeName", f.city as "franchiseeCity"
            FROM "Transaction" t
            LEFT JOIN "Deal" d ON t."dealId" = d.id
            LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
            WHERE t."franchiseeId" = ${user.franchiseeId}
            ORDER BY t.date DESC
            LIMIT 100
          `
          return NextResponse.json({ transactions, data: transactions })
        } else {
          return NextResponse.json({ transactions: [], data: [] })
        }
      } else if (user.role === "uk_employee") {
        const transactions = await sql`
          SELECT t.id, t.type, t.amount, t.description, t.category, t.date, t."createdAt",
            t."dealId", t."franchiseeId", t."gameLeadId",
            d."clientName" as "dealTitle",
            f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Transaction" t
          LEFT JOIN "Deal" d ON t."dealId" = d.id
          LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
          INNER JOIN "UserFranchiseeAssignment" ufa ON t."franchiseeId" = ufa."franchiseeId"
          WHERE ufa."userId" = ${user.id}
          ORDER BY t.date DESC
          LIMIT 100
        `
        return NextResponse.json({ transactions, data: transactions })
      } else {
        // UK/super_admin sees all transactions
        const transactions = await sql`
          SELECT t.id, t.type, t.amount, t.description, t.category, t.date, t."createdAt",
            t."dealId", t."franchiseeId", t."gameLeadId",
            d."clientName" as "dealTitle",
            f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Transaction" t
          LEFT JOIN "Deal" d ON t."dealId" = d.id
          LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
          ORDER BY t.date DESC
          LIMIT 100
        `
        return NextResponse.json({ transactions, data: transactions })
      }
    }
  } catch (error) {
    console.error("[v0] TRANSACTIONS_GET error:", error)
    return NextResponse.json({ transactions: [], data: [] })
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)
    const body = await request.json()

    const { dealId, franchiseeId, type, amount, description, date, category, gameLeadId } = body

    if (amount && (typeof amount !== "number" || amount < 0)) {
      return NextResponse.json({ error: "Неверная сумма транзакции" }, { status: 400 })
    }

    const actualFranchiseeId = franchiseeId || user.franchiseeId

    const result = await sql`
      INSERT INTO "Transaction" (
        id, "dealId", "franchiseeId", "gameLeadId", type, amount, description, category, date, "createdAt"
      ) VALUES (
        gen_random_uuid()::text,
        ${dealId || null},
        ${actualFranchiseeId},
        ${gameLeadId || null},
        ${type || "income"},
        ${amount || 0},
        ${description || ""},
        ${category || null},
        ${date ? new Date(date).toISOString() : new Date().toISOString()},
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
