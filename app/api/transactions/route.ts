import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyToken } from "@/lib/simple-auth"

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  const payload = await verifyToken(token)
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
            SELECT t.id, t.amount, t.notes, t."paymentMethod", t."paymentDate", t."createdAt",
              t."dealId", t."gameLeadId", t."franchiseeId", t."royaltyAmount",
              t.type, t.category, t.description, t.date,
              d."clientName" as "dealTitle",
              f.name as "franchiseeName", f.city as "franchiseeCity"
            FROM "Transaction" t
            LEFT JOIN "Deal" d ON t."dealId" = d.id
            LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
            WHERE t."franchiseeId" = ${user.franchiseeId}
            ORDER BY t."paymentDate" DESC
            LIMIT 100
          `
          return NextResponse.json({ transactions, data: transactions })
        } else {
          return NextResponse.json({ transactions: [], data: [] })
        }
      } else if (user.role === "uk_employee") {
        const transactions = await sql`
          SELECT t.id, t.amount, t.notes, t."paymentMethod", t."paymentDate", t."createdAt",
            t."dealId", t."franchiseeId", t."royaltyAmount",
            d."clientName" as "dealTitle",
            f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Transaction" t
          LEFT JOIN "Deal" d ON t."dealId" = d.id
          LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
          INNER JOIN "UserFranchiseeAssignment" ufa ON t."franchiseeId" = ufa."franchiseeId"
          WHERE ufa."userId" = ${user.id} AND t."franchiseeId" = ${franchiseeId}
          ORDER BY t."paymentDate" DESC
          LIMIT 100
        `
        return NextResponse.json({ transactions, data: transactions })
      } else {
        // UK/super_admin sees all or filtered by franchiseeId
        const transactions = await sql`
          SELECT t.id, t.amount, t.notes, t."paymentMethod", t."paymentDate", t."createdAt",
            t."dealId", t."franchiseeId", t."royaltyAmount",
            d."clientName" as "dealTitle",
            f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Transaction" t
          LEFT JOIN "Deal" d ON t."dealId" = d.id
          LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
          WHERE t."franchiseeId" = ${franchiseeId}
          ORDER BY t."paymentDate" DESC
          LIMIT 100
        `
        return NextResponse.json({ transactions, data: transactions })
      }
    } else {
      if (user.role === "franchisee" || user.role === "own_point" || user.role === "admin") {
        if (user.franchiseeId) {
          const transactions = await sql`
            SELECT t.id, t.amount, t.notes, t."paymentMethod", t."paymentDate", t."createdAt",
              t."dealId", t."gameLeadId", t."franchiseeId", t."royaltyAmount",
              t.type, t.category, t.description, t.date,
              d."clientName" as "dealTitle",
              f.name as "franchiseeName", f.city as "franchiseeCity"
            FROM "Transaction" t
            LEFT JOIN "Deal" d ON t."dealId" = d.id
            LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
            WHERE t."franchiseeId" = ${user.franchiseeId}
            ORDER BY t."paymentDate" DESC
            LIMIT 100
          `
          return NextResponse.json({ transactions, data: transactions })
        } else {
          return NextResponse.json({ transactions: [], data: [] })
        }
      } else if (user.role === "uk_employee") {
        const transactions = await sql`
          SELECT t.id, t.amount, t.notes, t."paymentMethod", t."paymentDate", t."createdAt",
            t."dealId", t."franchiseeId", t."royaltyAmount",
            d."clientName" as "dealTitle",
            f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Transaction" t
          LEFT JOIN "Deal" d ON t."dealId" = d.id
          LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
          INNER JOIN "UserFranchiseeAssignment" ufa ON t."franchiseeId" = ufa."franchiseeId"
          WHERE ufa."userId" = ${user.id}
          ORDER BY t."paymentDate" DESC
          LIMIT 100
        `
        return NextResponse.json({ transactions, data: transactions })
      } else {
        // UK/super_admin sees all transactions
        const transactions = await sql`
          SELECT t.id, t.amount, t.notes, t."paymentMethod", t."paymentDate", t."createdAt",
            t."dealId", t."franchiseeId", t."royaltyAmount",
            d."clientName" as "dealTitle",
            f.name as "franchiseeName", f.city as "franchiseeCity"
          FROM "Transaction" t
          LEFT JOIN "Deal" d ON t."dealId" = d.id
          LEFT JOIN "Franchisee" f ON t."franchiseeId" = f.id
          ORDER BY t."paymentDate" DESC
          LIMIT 100
        `
        return NextResponse.json({ transactions, data: transactions })
      }
    }
  } catch (error) {
    console.error("[v0] TRANSACTIONS_GET error:")
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

    const { dealId, gameLeadId, franchiseeId, amount, notes, paymentMethod, paymentDate, royaltyAmount, type, category, description, date } = body

    if (amount && (typeof amount !== "number" || amount < 0)) {
      return NextResponse.json({ error: "Неверная сумма транзакции" }, { status: 400 })
    }

    // H8: Non-UK roles must use their own franchiseeId — prevent cross-tenant write
    let actualFranchiseeId: string | null
    if (["uk", "super_admin", "uk_employee"].includes(user.role)) {
      actualFranchiseeId = franchiseeId || user.franchiseeId
    } else {
      actualFranchiseeId = user.franchiseeId
    }
    const txId = globalThis.crypto.randomUUID()

    const result = await sql`
      INSERT INTO "Transaction" (
        id, "dealId", "gameLeadId", "franchiseeId", amount, "paymentMethod", "paymentDate", "royaltyAmount", notes, type, category, description, date, "createdAt"
      ) VALUES (
        ${txId},
        ${dealId || null},
        ${gameLeadId || null},
        ${actualFranchiseeId},
        ${amount || 0},
        ${paymentMethod || "cash"},
        ${paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString()},
        ${royaltyAmount || 0},
        ${notes || null},
        ${type || null},
        ${category || null},
        ${description || null},
        ${date || new Date().toISOString().split("T")[0]},
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] TRANSACTIONS_POST error:")
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
