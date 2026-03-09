import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyToken } from "@/lib/simple-auth"

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const payload = await verifyToken(token)
    if (!payload) return null

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
      return NextResponse.json([])
    }

    const sql = neon(process.env.DATABASE_URL)
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    let expenses

    if (["uk", "UK", "super_admin", "uk_employee"].includes(user.role)) {
      // UK can see all or filter by franchiseeId
      if (franchiseeId) {
        expenses = await sql`
          SELECT e.*, e."expenseDate" as date
          FROM "Expense" e
          WHERE e."franchiseeId" = ${franchiseeId}
          ORDER BY e."expenseDate" DESC
        `
      } else {
        expenses = await sql`
          SELECT e.*, e."expenseDate" as date
          FROM "Expense" e
          ORDER BY e."expenseDate" DESC
        `
      }
    } else if (user.franchiseeId) {
      // Others see only their franchisee expenses
      expenses = await sql`
        SELECT e.*, e."expenseDate" as date
        FROM "Expense" e
        WHERE e."franchiseeId" = ${user.franchiseeId}
        ORDER BY e."expenseDate" DESC
      `
    } else {
      expenses = []
    }

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("[v0] EXPENSES_GET error:", error)
    return NextResponse.json([])
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

    // H7: Non-UK roles must use their own franchiseeId — prevent cross-tenant write
    let targetFranchiseeId: string
    if (["uk", "super_admin", "uk_employee"].includes(user.role)) {
      targetFranchiseeId = body.franchiseeId || user.franchiseeId
    } else {
      targetFranchiseeId = user.franchiseeId!
    }

    if (!targetFranchiseeId) {
      return NextResponse.json({ error: "Franchisee ID is required" }, { status: 400 })
    }

    // Insert new expense
    const expenseId = globalThis.crypto.randomUUID()
    const result = await sql`
      INSERT INTO "Expense" (
        id, category, amount, "expenseDate", description, "franchiseeId", "createdById", "createdAt"
      ) VALUES (
        ${expenseId},
        ${body.category || "other"},
        ${body.amount || 0},
        ${body.date ? new Date(body.date).toISOString() : new Date().toISOString()},
        ${body.description || ""},
        ${targetFranchiseeId},
        ${user.id},
        NOW()
      )
      RETURNING *, "expenseDate" as date
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] EXPENSES_POST error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
