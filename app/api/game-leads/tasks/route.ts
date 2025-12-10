import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")
    const status = searchParams.get("status")
    const assigneeId = searchParams.get("assigneeId")

    let query = `
      SELECT 
        t.id, t.title, t.description, t.deadline, t.status,
        t."leadId", t."assigneeId", t."assigneeName", t."assigneeType",
        l."clientName"
      FROM "GameLeadTask" t
      LEFT JOIN "GameLead" l ON t."leadId" = l.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (franchiseeId) {
      query += ` AND l."franchiseeId" = $${paramIndex++}`
      params.push(franchiseeId)
    }

    if (status) {
      query += ` AND t.status = $${paramIndex++}`
      params.push(status)
    }

    if (assigneeId) {
      query += ` AND t."assigneeId" = $${paramIndex++}`
      params.push(assigneeId)
    }

    query += ` ORDER BY t.deadline ASC NULLS LAST, t."createdAt" DESC`

    const result = await sql.query(query, params)

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch tasks" }, { status: 500 })
  }
}
