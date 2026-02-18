import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"
import { cache } from "@/lib/cache"

// Префикс ключей кеша для франчайзи
const CACHE_PREFIX = "franchisees:"
// TTL кеша — 5 минут
const CACHE_TTL = 300

export async function GET(request: Request) {
  try {
    const user = await verifyRequest(request as any)

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json([])
    }

    // --- Кеш: формируем ключ на основе роли и franchiseeId ---
    const cacheKey =
      user.role === "uk_employee"
        ? `${CACHE_PREFIX}uk_employee:${user.userId}`
        : user.franchiseeId
          ? `${CACHE_PREFIX}franchisee:${user.franchiseeId}`
          : `${CACHE_PREFIX}all`

    // --- Кеш: проверяем наличие данных в кеше ---
    const cached = await cache.get<unknown[]>(cacheKey)
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          "X-Cache": "HIT",
        },
      })
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
        WHERE ufa."userId" = ${user.userId}
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

    // --- Кеш: сохраняем результат с TTL 5 минут ---
    await cache.set(cacheKey, franchisees, CACHE_TTL)

    return NextResponse.json(franchisees, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        "X-Cache": "MISS",
      },
    })
  } catch (error) {
    console.error("[v0] FRANCHISEES_GET error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyRequest(request as any)

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!["super_admin", "uk", "uk_employee"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
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

    // --- Кеш: инвалидируем все ключи франчайзи после создания ---
    await cache.invalidatePattern(CACHE_PREFIX)

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("[v0] FRANCHISEES_POST error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
