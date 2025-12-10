import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const games = await sql`
      SELECT 
        g.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', gs.id,
              'personnelId', gs."personnelId",
              'name', u.name,
              'role', gs.role,
              'rate', gs.rate
            )
          ) FILTER (WHERE gs.id IS NOT NULL),
          '[]'
        ) as "assignedStaff"
      FROM "Game" g
      LEFT JOIN "GameStaff" gs ON g.id = gs."gameId"
      LEFT JOIN "Personnel" p ON gs."personnelId" = p.id
      LEFT JOIN "User" u ON p."userId" = u.id
      WHERE g.id = ${id}
      GROUP BY g.id
    `

    if (games.length === 0) {
      return NextResponse.json({ success: false, error: "Game not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, game: games[0] })
  } catch (error) {
    console.error("[v0] Game GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch game" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateFields: string[] = []
    const values: any[] = []

    const allowedFields = [
      "clientName",
      "clientPhone",
      "gameDate",
      "gameStartTime",
      "gameEndTime",
      "playersCount",
      "packageType",
      "packagePrice",
      "animatorsCount",
      "hostsCount",
      "djsCount",
      "animatorRate",
      "hostRate",
      "djRate",
      "prepayment",
      "notes",
      "status",
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`"${field}" = $${values.length + 1}`)
        values.push(body[field])
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 })
    }

    values.push(id)
    const query = `UPDATE "Game" SET ${updateFields.join(", ")}, "updatedAt" = NOW() WHERE id = $${values.length} RETURNING *`

    const result = await sql(query, values)

    return NextResponse.json({ success: true, game: result[0] })
  } catch (error) {
    console.error("[v0] Game PUT error:", error)
    return NextResponse.json({ success: false, error: "Failed to update game" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await sql`DELETE FROM "GameStaff" WHERE "gameId" = ${id}`
    await sql`DELETE FROM "Game" WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Game DELETE error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete game" }, { status: 500 })
  }
}
