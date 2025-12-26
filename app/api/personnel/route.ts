import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  const token = authHeader.substring(7)
  try {
    const payload = verifyToken(token)
    if (!payload) return null

    return {
      id: payload.userId as string,
      name: payload.name as string,
      role: payload.role as string,
      franchiseeId: payload.franchiseeId as string | null,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    const { searchParams } = new URL(req.url)
    const franchiseeId = searchParams.get("franchiseeId") || user?.franchiseeId

    if (!franchiseeId) {
      return NextResponse.json({ error: "franchiseeId is required" }, { status: 400 })
    }

    // Get personnel from Personnel table
    const personnel = await sql`
      SELECT p.id, p.name, p.role, p.phone, p."hourlyRate" as rate, p."isActive"
      FROM "Personnel" p
      WHERE p."franchiseeId" = ${franchiseeId} AND p."isActive" = true
      ORDER BY p.name
    `

    return NextResponse.json({ success: true, data: personnel })
  } catch (error) {
    console.error("[v0] Error fetching personnel:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, role, phone, rate } = body

    const franchiseeId = user.franchiseeId
    if (!franchiseeId) {
      return NextResponse.json({ error: "No franchisee context" }, { status: 400 })
    }

    const [personnel] = await sql`
      INSERT INTO "Personnel" (id, "franchiseeId", name, role, phone, "hourlyRate", "isActive")
      VALUES (gen_random_uuid()::text, ${franchiseeId}, ${name}, ${role}, ${phone || null}, ${rate || 0}, true)
      RETURNING id, name, role, phone, "hourlyRate" as rate, "isActive"
    `

    return NextResponse.json({ success: true, data: personnel })
  } catch (error) {
    console.error("[v0] Error creating personnel:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
