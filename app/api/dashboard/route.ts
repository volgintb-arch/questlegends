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

    let stats
    if (user.role === "uk_employee") {
      // uk_employee sees only stats for assigned franchisees
      stats = await sql`
        WITH assigned_franchisees AS (
          SELECT "franchiseeId" FROM "UserFranchiseeAssignment" WHERE "userId" = ${user.id}
        )
        SELECT 
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as "totalRevenue",
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as "totalExpenses",
          (SELECT COUNT(*) FROM "Franchisee" f WHERE f.id IN (SELECT "franchiseeId" FROM assigned_franchisees)) as "franchiseesCount",
          (SELECT COUNT(*) FROM "Deal" d WHERE d."franchiseeId" IN (SELECT "franchiseeId" FROM assigned_franchisees)) as "dealsCount"
        FROM "Transaction" t
        WHERE t."franchiseeId" IN (SELECT "franchiseeId" FROM assigned_franchisees)
      `
    } else if (user.role === "super_admin" || user.role === "uk") {
      stats = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as "totalRevenue",
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as "totalExpenses",
          (SELECT COUNT(*) FROM "Franchisee") as "franchiseesCount",
          (SELECT COUNT(*) FROM "Deal") as "dealsCount"
        FROM "Transaction"
      `
    } else if (user.franchiseeId) {
      stats = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as "totalRevenue",
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as "totalExpenses",
          1 as "franchiseesCount",
          (SELECT COUNT(*) FROM "Deal" WHERE "franchiseeId" = ${user.franchiseeId}) as "dealsCount"
        FROM "Transaction"
        WHERE "franchiseeId" = ${user.franchiseeId}
      `
    } else {
      stats = [{ totalRevenue: 0, totalExpenses: 0, franchiseesCount: 0, dealsCount: 0 }]
    }

    // Get top franchisees (filtered for uk_employee)
    let topFranchisees
    if (user.role === "uk_employee") {
      topFranchisees = await sql`
        SELECT f.id, f.name, f.city,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as revenue
        FROM "Franchisee" f
        LEFT JOIN "Transaction" t ON t."franchiseeId" = f.id
        INNER JOIN "UserFranchiseeAssignment" ufa ON f.id = ufa."franchiseeId"
        WHERE ufa."userId" = ${user.id}
        GROUP BY f.id, f.name, f.city
        ORDER BY revenue DESC
        LIMIT 5
      `
    } else if (user.role === "super_admin" || user.role === "uk") {
      topFranchisees = await sql`
        SELECT f.id, f.name, f.city,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as revenue
        FROM "Franchisee" f
        LEFT JOIN "Transaction" t ON t."franchiseeId" = f.id
        GROUP BY f.id, f.name, f.city
        ORDER BY revenue DESC
        LIMIT 5
      `
    } else {
      topFranchisees = []
    }

    return NextResponse.json({
      totalRevenue: Number(stats[0]?.totalRevenue) || 0,
      totalExpenses: Number(stats[0]?.totalExpenses) || 0,
      franchiseesCount: Number(stats[0]?.franchiseesCount) || 0,
      dealsCount: Number(stats[0]?.dealsCount) || 0,
      topFranchisees: topFranchisees || [],
    })
  } catch (error) {
    console.error("[v0] DASHBOARD_GET error:", error)
    return NextResponse.json({
      totalRevenue: 0,
      totalExpenses: 0,
      franchiseesCount: 0,
      dealsCount: 0,
      topFranchisees: [],
    })
  }
}
