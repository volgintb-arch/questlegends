import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const events = await sql`
      SELECT e.*, u.name as "userName"
      FROM "GameLeadEvent" e
      LEFT JOIN "User" u ON e."userId" = u.id
      WHERE e."leadId" = ${id}
      ORDER BY e."createdAt" DESC
    `

    return NextResponse.json({ success: true, events })
  } catch (error) {
    console.error("[v0] Error fetching events:")
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { type, content, userId, userName } = body

    const eventId = globalThis.crypto.randomUUID()
    const [event] = await sql`
      INSERT INTO "GameLeadEvent" (id, "leadId", type, content, "userId", "userName")
      VALUES (${eventId}, ${id}, ${type || "note"}, ${content}, ${userId}, ${userName})
      RETURNING *
    `

    return NextResponse.json({ success: true, event: { ...event, userName } })
  } catch (error) {
    console.error("[v0] Error creating event:")
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
}
