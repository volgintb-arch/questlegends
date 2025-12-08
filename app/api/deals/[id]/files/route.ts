import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || "secret") as any
    return decoded
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromToken(request)
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
    console.error("Error fetching files:", error)
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, url, type, size } = body

    const [file] = await sql`
      INSERT INTO "DealFile" ("dealId", name, url, type, size, "uploadedById")
      VALUES (${id}, ${name}, ${url}, ${type || null}, ${size || null}, ${user.id})
      RETURNING *
    `

    // Create event for file upload
    await sql`
      INSERT INTO "DealEvent" ("dealId", type, content, "userId", "userName", metadata)
      VALUES (${id}, 'file', ${`Прикреплен файл: ${name}`}, ${user.id}, ${user.name}, ${JSON.stringify({ fileId: file.id })})
    `

    return NextResponse.json({ data: file })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
