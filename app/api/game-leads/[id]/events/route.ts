import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    console.error("[v0] Error fetching events:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { type, content, userId, userName } = body

    const [event] = await sql`
      INSERT INTO "GameLeadEvent" ("leadId", type, content, "userId", "userName")
      VALUES (${id}, ${type || "note"}, ${content}, ${userId}, ${userName})
      RETURNING *
    `

    return NextResponse.json({ success: true, event: { ...event, userName } })
  } catch (error) {
    console.error("[v0] Error creating event:", error)
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
}
