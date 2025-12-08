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

    // UK can view all franchisees, others see only their own
    let franchisees
    if (user.role === "uk" || user.role === "UK") {
      franchisees = await sql`
        SELECT f.*, 
          (SELECT COUNT(*) FROM "Deal" d WHERE d."franchiseeId" = f.id) as "dealsCount",
          (SELECT COUNT(*) FROM "User" u WHERE u."franchiseeId" = f.id) as "usersCount"
        FROM "Franchisee" f
        ORDER BY f.name ASC
      `
    } else if (user.franchiseeId) {
      franchisees = await sql`
        SELECT f.*,
          (SELECT COUNT(*) FROM "Deal" d WHERE d."franchiseeId" = f.id) as "dealsCount",
          (SELECT COUNT(*) FROM "User" u WHERE u."franchiseeId" = f.id) as "usersCount"
        FROM "Franchisee" f
        WHERE f.id = ${user.franchiseeId}
      `
    } else {
      franchisees = []
    }

    return NextResponse.json(franchisees)
  } catch (error) {
    console.error("[v0] FRANCHISEES_GET error:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only UK can create franchisees
    if (user.role !== "uk" && user.role !== "UK") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)
    const body = await request.json()

    const result = await sql`
      INSERT INTO "Franchisee" (
        id, name, city, address, phone, email, "royaltyPercent", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        ${body.name || ""},
        ${body.city || ""},
        ${body.address || ""},
        ${body.phone || ""},
        ${body.email || ""},
        ${body.royaltyPercent || 10},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("[v0] FRANCHISEES_POST error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
