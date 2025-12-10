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

    let franchisees
    if (user.role === "super_admin" || user.role === "uk") {
      franchisees = await sql`
        SELECT f.*, 
          COALESCE(f."royaltyPercent", 7) as "royaltyPercent",
          (SELECT COUNT(*) FROM "Deal" d WHERE d."franchiseeId" = f.id) as "dealsCount",
          (SELECT COUNT(*) FROM "User" u WHERE u."franchiseeId" = f.id) as "usersCount"
        FROM "Franchisee" f
        ORDER BY f.name ASC
      `
    } else if (user.role === "uk_employee") {
      franchisees = await sql`
        SELECT f.*, 
          COALESCE(f."royaltyPercent", 7) as "royaltyPercent",
          (SELECT COUNT(*) FROM "Deal" d WHERE d."franchiseeId" = f.id) as "dealsCount",
          (SELECT COUNT(*) FROM "User" u WHERE u."franchiseeId" = f.id) as "usersCount"
        FROM "Franchisee" f
        INNER JOIN "UserFranchiseeAssignment" ufa ON f.id = ufa."franchiseeId"
        WHERE ufa."userId" = ${user.id}
        ORDER BY f.name ASC
      `
    } else if (user.franchiseeId) {
      franchisees = await sql`
        SELECT f.*,
          COALESCE(f."royaltyPercent", 7) as "royaltyPercent",
          (SELECT COUNT(*) FROM "Deal" d WHERE d."franchiseeId" = f.id) as "dealsCount",
          (SELECT COUNT(*) FROM "User" u WHERE u."franchiseeId" = f.id) as "usersCount"
        FROM "Franchisee" f
        WHERE f.id = ${user.franchiseeId}
      `
    } else {
      franchisees = []
    }

    console.log("[v0] Franchisees API: Found", franchisees.length, "franchisees for role", user.role)

    return NextResponse.json(franchisees, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    })
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

    if (user.role !== "super_admin" && user.role !== "uk" && user.role !== "uk_employee") {
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
        ${body.royaltyPercent || 7},
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
