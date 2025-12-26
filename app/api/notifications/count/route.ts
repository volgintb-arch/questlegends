import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"

async function queryWithRetry(sql: ReturnType<typeof neon>, query: () => Promise<any>, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await query()
    } catch (error) {
      if (i === retries) throw error
      await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)))
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    const result = await queryWithRetry(
      sql,
      () => sql`
      SELECT COUNT(*) as count
      FROM "Notification"
      WHERE "recipientId" = ${user.userId}
        AND "isRead" = false
        AND "isArchived" = false
    `,
    )

    return NextResponse.json({ count: Number.parseInt(result[0]?.count || "0") })
  } catch (error) {
    // Return 0 on error to not break the UI
    return NextResponse.json({ count: 0 })
  }
}
