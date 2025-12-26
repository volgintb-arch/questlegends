import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyRequest } from "@/lib/simple-auth"
import { jwtVerify } from "jose"

async function getCurrentUser(request: NextRequest) {
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

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "super_admin" && user.role !== "uk" && user.role !== "uk_employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    const logs = await sql`
      SELECT 
        id,
        "dealId",
        action,
        "fromStageId",
        "toStageId",
        "fromStageName",
        "toStageName",
        "pipelineId",
        "pipelineName",
        "userId",
        "userName",
        details,
        "createdAt"
      FROM "DealLog"
      ORDER BY "createdAt" DESC
      LIMIT 500
    `

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[v0] Error fetching CRM logs:", error)
    return NextResponse.json({ error: "Internal error", logs: [] }, { status: 500 })
  }
}
