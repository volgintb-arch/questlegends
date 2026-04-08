import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { sql } from "@/lib/db"

// GET — получить журнал звонков
export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
    const search = searchParams.get("search") || ""
    const offset = (page - 1) * limit

    const isUK = ["super_admin", "uk", "uk_employee"].includes(user.role)
    const franchiseeId = isUK ? null : (user.franchiseeId || null)

    let calls
    let countResult

    if (search) {
      const searchPattern = `%${search}%`
      if (isUK) {
        calls = await sql`
          SELECT * FROM call_log
          WHERE ("callerNumber" LIKE ${searchPattern} OR "calledNumber" LIKE ${searchPattern})
          ORDER BY "startedAt" DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        countResult = await sql`
          SELECT COUNT(*)::int as count FROM call_log
          WHERE ("callerNumber" LIKE ${searchPattern} OR "calledNumber" LIKE ${searchPattern})
        `
      } else {
        calls = await sql`
          SELECT * FROM call_log
          WHERE "franchiseeId" = ${franchiseeId}
            AND ("callerNumber" LIKE ${searchPattern} OR "calledNumber" LIKE ${searchPattern})
          ORDER BY "startedAt" DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        countResult = await sql`
          SELECT COUNT(*)::int as count FROM call_log
          WHERE "franchiseeId" = ${franchiseeId}
            AND ("callerNumber" LIKE ${searchPattern} OR "calledNumber" LIKE ${searchPattern})
        `
      }
    } else {
      if (isUK) {
        calls = await sql`
          SELECT * FROM call_log
          ORDER BY "startedAt" DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        countResult = await sql`
          SELECT COUNT(*)::int as count FROM call_log
        `
      } else {
        calls = await sql`
          SELECT * FROM call_log
          WHERE "franchiseeId" = ${franchiseeId}
          ORDER BY "startedAt" DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        countResult = await sql`
          SELECT COUNT(*)::int as count FROM call_log
          WHERE "franchiseeId" = ${franchiseeId}
        `
      }
    }

    return NextResponse.json({
      calls,
      total: countResult[0]?.count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error("[sipuni] Calls GET error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
