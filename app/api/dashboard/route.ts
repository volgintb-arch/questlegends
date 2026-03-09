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
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        totalRevenue: 0,
        totalExpenses: 0,
        franchiseesCount: 0,
        dealsCount: 0,
        monthlyRevenue: [],
        topFranchisees: [],
      })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Optimized: all dashboard data in a single query per role using CTEs
    if (user.role === "uk_employee") {
      const result = await sql`
        WITH af AS (
          SELECT "franchiseeId" FROM "UserFranchiseeAssignment" WHERE "userId" = ${user.id}
        ),
        stats AS (
          SELECT
            COALESCE((SELECT SUM(t.amount) FROM "Transaction" t WHERE t."franchiseeId" IN (SELECT "franchiseeId" FROM af)), 0) as "totalRevenue",
            COALESCE((SELECT SUM(e.amount) FROM "Expense" e WHERE e."franchiseeId" IN (SELECT "franchiseeId" FROM af)), 0) as "totalExpenses",
            (SELECT COUNT(*) FROM "Franchisee" f WHERE f.id IN (SELECT "franchiseeId" FROM af)) as "franchiseesCount",
            (SELECT COUNT(*) FROM "Deal" d WHERE d."franchiseeId" IN (SELECT "franchiseeId" FROM af)) as "dealsCount"
        ),
        top5 AS (
          SELECT f.id, f.name, f.city,
            COALESCE(SUM(t.amount), 0) as revenue
          FROM "Franchisee" f
          LEFT JOIN "Transaction" t ON t."franchiseeId" = f.id
          WHERE f.id IN (SELECT "franchiseeId" FROM af)
          GROUP BY f.id, f.name, f.city
          ORDER BY revenue DESC
          LIMIT 5
        )
        SELECT
          json_build_object(
            'totalRevenue', (SELECT "totalRevenue" FROM stats),
            'totalExpenses', (SELECT "totalExpenses" FROM stats),
            'franchiseesCount', (SELECT "franchiseesCount" FROM stats),
            'dealsCount', (SELECT "dealsCount" FROM stats),
            'topFranchisees', COALESCE((SELECT json_agg(row_to_json(t.*)) FROM top5 t), '[]'::json)
          ) as data
      `
      const data = result[0]?.data || {}
      return NextResponse.json({
        totalRevenue: Number(data.totalRevenue) || 0,
        totalExpenses: Number(data.totalExpenses) || 0,
        franchiseesCount: Number(data.franchiseesCount) || 0,
        dealsCount: Number(data.dealsCount) || 0,
        topFranchisees: data.topFranchisees || [],
      })
    }

    if (user.role === "super_admin" || user.role === "uk") {
      const result = await sql`
        WITH stats AS (
          SELECT
            COALESCE((SELECT SUM(amount) FROM "Transaction"), 0) as "totalRevenue",
            COALESCE((SELECT SUM(amount) FROM "Expense"), 0) as "totalExpenses",
            (SELECT COUNT(*) FROM "Franchisee") as "franchiseesCount",
            (SELECT COUNT(*) FROM "Deal") as "dealsCount"
        ),
        top5 AS (
          SELECT f.id, f.name, f.city,
            COALESCE(SUM(t.amount), 0) as revenue
          FROM "Franchisee" f
          LEFT JOIN "Transaction" t ON t."franchiseeId" = f.id
          GROUP BY f.id, f.name, f.city
          ORDER BY revenue DESC
          LIMIT 5
        )
        SELECT
          json_build_object(
            'totalRevenue', (SELECT "totalRevenue" FROM stats),
            'totalExpenses', (SELECT "totalExpenses" FROM stats),
            'franchiseesCount', (SELECT "franchiseesCount" FROM stats),
            'dealsCount', (SELECT "dealsCount" FROM stats),
            'topFranchisees', COALESCE((SELECT json_agg(row_to_json(t.*)) FROM top5 t), '[]'::json)
          ) as data
      `
      const data = result[0]?.data || {}
      return NextResponse.json({
        totalRevenue: Number(data.totalRevenue) || 0,
        totalExpenses: Number(data.totalExpenses) || 0,
        franchiseesCount: Number(data.franchiseesCount) || 0,
        dealsCount: Number(data.dealsCount) || 0,
        topFranchisees: data.topFranchisees || [],
      })
    }

    if (user.franchiseeId) {
      const result = await sql`
        SELECT
          COALESCE((SELECT SUM(amount) FROM "Transaction" WHERE "franchiseeId" = ${user.franchiseeId}), 0) as "totalRevenue",
          COALESCE((SELECT SUM(amount) FROM "Expense" WHERE "franchiseeId" = ${user.franchiseeId}), 0) as "totalExpenses",
          1 as "franchiseesCount",
          (SELECT COUNT(*) FROM "Deal" WHERE "franchiseeId" = ${user.franchiseeId}) as "dealsCount"
      `
      return NextResponse.json({
        totalRevenue: Number(result[0]?.totalRevenue) || 0,
        totalExpenses: Number(result[0]?.totalExpenses) || 0,
        franchiseesCount: 1,
        dealsCount: Number(result[0]?.dealsCount) || 0,
        topFranchisees: [],
      })
    }

    return NextResponse.json({
      totalRevenue: 0,
      totalExpenses: 0,
      franchiseesCount: 0,
      dealsCount: 0,
      topFranchisees: [],
    })
  } catch (error) {
    console.error("[v0] DASHBOARD_GET error:")
    return NextResponse.json({
      totalRevenue: 0,
      totalExpenses: 0,
      franchiseesCount: 0,
      dealsCount: 0,
      topFranchisees: [],
    })
  }
}
