import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Get top franchisees by transaction revenue
    const result = await sql`
      SELECT 
        f.id,
        f.name,
        f.city,
        COALESCE(SUM(t.amount), 0)::numeric as revenue
      FROM "Franchisee" f
      LEFT JOIN "Transaction" t ON t."franchiseeId" = f.id 
        AND t."createdAt" >= NOW() - INTERVAL '30 days'
        AND t.type = 'income'
      GROUP BY f.id, f.name, f.city
      ORDER BY revenue DESC
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      data: result.map((r) => ({
        id: r.id,
        name: r.city ? `${r.city} - ${r.name}` : r.name,
        revenue: Number(r.revenue) || 0,
      })),
    })
  } catch (error) {
    console.error("[v0] Top locations API error:", error)
    return NextResponse.json({ success: true, data: [] })
  }
}
