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
      return NextResponse.json([])
    }

    const sql = neon(process.env.DATABASE_URL)
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    let expenses

    if (user.role === "uk" || user.role === "UK") {
      // UK can see all or filter by franchiseeId
      if (franchiseeId) {
        expenses = await sql`
          SELECT e.*
          FROM "Expense" e
          WHERE e."franchiseeId" = ${franchiseeId}
          ORDER BY e.date DESC
        `
      } else {
        expenses = await sql`
          SELECT e.*
          FROM "Expense" e
          ORDER BY e.date DESC
        `
      }
    } else if (user.franchiseeId) {
      // Others see only their franchisee expenses
      expenses = await sql`
        SELECT e.*
        FROM "Expense" e
        WHERE e."franchiseeId" = ${user.franchiseeId}
        ORDER BY e.date DESC
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

    const targetFranchiseeId = body.franchiseeId || user.franchiseeId

    if (!targetFranchiseeId) {
      return NextResponse.json({ error: "Franchisee ID is required" }, { status: 400 })
    }

    // Insert new expense
    const result = await sql`
      INSERT INTO "Expense" (
        id, category, amount, date, description, "fileUrl", "franchiseeId", "createdAt"
      ) VALUES (
        gen_random_uuid(),
        ${body.category || "other"},
        ${body.amount || 0},
        ${body.date ? new Date(body.date).toISOString() : new Date().toISOString()},
        ${body.description || ""},
        ${body.fileUrl || null},
        ${targetFranchiseeId},
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] EXPENSES_POST error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
