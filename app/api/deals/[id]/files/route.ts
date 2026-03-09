import { neon } from "@/lib/neon-compat"
import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const files = await sql`
      SELECT * FROM "DealFile"
      WHERE "dealId" = ${id}
      ORDER BY "createdAt" DESC
    `

    return NextResponse.json({ data: files })
  } catch (error) {
    console.error("[v0] Error fetching files:")
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
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

    const { name, url, type, size } = body

    if (!name || !url) {
      return NextResponse.json({ error: "Missing required fields: name and url" }, { status: 400 })
    }

    const fileId = globalThis.crypto.randomUUID()
    const [file] = await sql`
      INSERT INTO "DealFile" (id, "dealId", name, url, type, size, "uploadedById")
      VALUES (${fileId}, ${id}, ${name}, ${url}, ${type || null}, ${size || null}, ${user.userId})
      RETURNING *
    `

    const eventId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "DealEvent" (id, "dealId", type, content, "userId", "userName", metadata)
      VALUES (${eventId}, ${id}, 'file', ${`Прикреплен файл: ${name}`}, ${user.userId}, ${user.name}, ${JSON.stringify({ fileId: file.id })})
    `

    return NextResponse.json({ data: file })
  } catch (error: any) {
    console.error("[v0] ===== FILES API ERROR =====")
    console.error("[v0] Error message:")
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json(
      {
        error: "Failed to upload file",
      },
      { status: 500 },
    )
  }
}
