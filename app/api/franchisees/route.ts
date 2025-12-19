import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireApiAuth, requireRoles, sanitizeBody, withRateLimit } from "@/lib/api-auth"
import { jwtVerify } from "jose/jwt/verify"

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
  const rateLimitError = await withRateLimit(request, 100, 60000)
  if (rateLimitError) return rateLimitError

  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  try {
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
          (SELECT COUNT(*) FROM "User" u WHERE u."franchiseeId" = f.id AND u.role != 'own_point') as "usersCount",
          (SELECT u.role FROM "User" u WHERE u."franchiseeId" = f.id AND u.role IN ('franchisee', 'own_point') LIMIT 1) as "ownerRole"
        FROM "Franchisee" f
        ORDER BY f.name ASC
      `
    } else if (user.role === "uk_employee") {
      franchisees = await sql`
        SELECT f.*, 
          COALESCE(f."royaltyPercent", 7) as "royaltyPercent",
          (SELECT COUNT(*) FROM "Deal" d WHERE d."franchiseeId" = f.id) as "dealsCount",
          (SELECT COUNT(*) FROM "User" u WHERE u."franchiseeId" = f.id AND u.role != 'own_point') as "usersCount",
          (SELECT u.role FROM "User" u WHERE u."franchiseeId" = f.id AND u.role IN ('franchisee', 'own_point') LIMIT 1) as "ownerRole"
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
          (SELECT COUNT(*) FROM "User" u WHERE u."franchiseeId" = f.id) as "usersCount",
          (SELECT u.role FROM "User" u WHERE u."franchiseeId" = f.id AND u.role IN ('franchisee', 'own_point') LIMIT 1) as "ownerRole"
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
  const rateLimitError = await withRateLimit(request, 10, 60000)
  if (rateLimitError) return rateLimitError

  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  const rolesError = requireRoles(user, ["super_admin", "uk", "uk_employee"])
  if (rolesError) return rolesError

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)
    const rawBody = await request.json()
    const body = sanitizeBody(rawBody)

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
