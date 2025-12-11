import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  console.log("[v0] Events API - auth header exists:", !!authHeader)

  if (!authHeader?.startsWith("Bearer ")) return null

  try {
    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "secret")
    const { payload } = await jwtVerify(token, secret)
    console.log("[v0] Events API - token verified for user:", payload.name)
    return payload
  } catch (e) {
    console.error("[v0] Events API - token verification failed:", e)
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log("[v0] Events API GET called")
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      console.log("[v0] Events API - unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    console.log("[v0] Events API - fetching events for deal:", id)

    const sql = neon(process.env.DATABASE_URL!)

    const events = await sql`
      SELECT * FROM "DealEvent"
      WHERE "dealId" = ${id}
      ORDER BY "createdAt" DESC
    `

    console.log("[v0] Events API - found events:", events.length)

    return NextResponse.json({ events })
  } catch (error: any) {
    console.error("[v0] Events API error:", error.message)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { type, content, metadata } = body

    console.log("[v0] Creating event for deal:", id, "type:", type, "user:", user.name)

    const sql = neon(process.env.DATABASE_URL!)

    const [event] = await sql`
      INSERT INTO "DealEvent" ("dealId", type, content, "userId", "userName", metadata)
      VALUES (${id}, ${type}, ${content}, ${user.userId || user.id}, ${user.name}, ${JSON.stringify(metadata || {})})
      RETURNING *
    `

    console.log("[v0] Event created:", event.id)

    return NextResponse.json({ data: event, success: true })
  } catch (error: any) {
    console.error("[v0] Error creating event:", error.message)
    return NextResponse.json({ error: "Failed to create event", details: error.message }, { status: 500 })
  }
}
