import { neon } from "@/lib/neon-compat"
import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const sql = neon(process.env.DATABASE_URL!)

    const events = await sql`
      SELECT * FROM "DealEvent"
      WHERE "dealId" = ${id}
      ORDER BY "createdAt" DESC
    `


    return NextResponse.json({ events })
  } catch (error: any) {
    console.error("[v0] Events API error:")
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { type, content, metadata } = body


    const sql = neon(process.env.DATABASE_URL!)

    const eventId = globalThis.crypto.randomUUID()
    const [event] = await sql`
      INSERT INTO "DealEvent" (id, "dealId", type, content, "userId", "userName", metadata)
      VALUES (${eventId}, ${id}, ${type}, ${content}, ${user.userId}, ${user.name}, ${JSON.stringify(metadata || {})})
      RETURNING *
    `


    return NextResponse.json({ data: event, success: true })
  } catch (error: any) {
    console.error("[v0] Error creating event:")
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
}
