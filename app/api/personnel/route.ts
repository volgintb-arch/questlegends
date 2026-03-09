import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyToken } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  const token = authHeader.substring(7)
  try {
    const payload = await verifyToken(token)
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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)

    // M2: Non-UK roles must use their own franchiseeId
    let franchiseeId: string | null
    if (["uk", "super_admin", "uk_employee"].includes(user.role)) {
      franchiseeId = searchParams.get("franchiseeId") || user.franchiseeId
    } else {
      franchiseeId = user.franchiseeId
    }

    if (!franchiseeId) {
      return NextResponse.json({ error: "franchiseeId is required" }, { status: 400 })
    }

    // Get active personnel — exclude those whose linked User was deleted or deactivated
    const personnel = await sql`
      SELECT p.id, p.name, p.role, p.phone, p."isActive"
      FROM "Personnel" p
      LEFT JOIN "User" u ON u.id = p."userId"
      WHERE p."franchiseeId" = ${franchiseeId} AND p."isActive" = true
        AND p.name IS NOT NULL AND p.name != ''
        AND (p."userId" IS NULL OR u."isActive" = true)
      ORDER BY p.name
    `

    return NextResponse.json({ success: true, data: personnel })
  } catch (error) {
    console.error("[v0] Error fetching personnel:")
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

    const personnelId = globalThis.crypto.randomUUID()
    const [personnel] = await sql`
      INSERT INTO "Personnel" (id, "franchiseeId", name, role, phone, "isActive")
      VALUES (${personnelId}, ${franchiseeId}, ${name}, ${role}, ${phone || null}, true)
      RETURNING id, name, role, phone, "isActive"
    `

    return NextResponse.json({ success: true, data: personnel })
  } catch (error) {
    console.error("[v0] Error creating personnel:")
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
