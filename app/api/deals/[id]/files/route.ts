import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { jwtVerify } from "jose/jwt/verify"

const sql = neon(process.env.DATABASE_URL!)

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.userId as string,
      role: payload.role as string,
      name: payload.name as string,
    }
  } catch (error) {
    console.error("[v0] Token verification failed:", error)
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    const files = await sql`
      SELECT * FROM "DealFile"
      WHERE "dealId" = ${id}
      ORDER BY "createdAt" DESC
    `

    return NextResponse.json({ data: files })
  } catch (error) {
    console.error("[v0] Error fetching files:", error)
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("[v0] ===== FILES API POST CALLED =====")

  try {
    const user = await verifyRequest(request)
    console.log("[v0] User from token:", user ? user.userId : "null")

    if (!user) {
      console.log("[v0] Unauthorized - no valid user token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    console.log("[v0] Deal ID:", id)

    const body = await request.json()
    console.log("[v0] Request body:", JSON.stringify(body))

    const { name, url, type, size } = body

    if (!name || !url) {
      console.log("[v0] Missing required fields: name or url")
      return NextResponse.json({ error: "Missing required fields: name and url" }, { status: 400 })
    }

    console.log("[v0] Inserting file record into database...")
    const [file] = await sql`
      INSERT INTO "DealFile" ("dealId", name, url, type, size, "uploadedById")
      VALUES (${id}, ${name}, ${url}, ${type || null}, ${size || null}, ${user.userId})
      RETURNING *
    `
    console.log("[v0] File record created:", file.id)

    console.log("[v0] Creating deal event...")
    await sql`
      INSERT INTO "DealEvent" ("dealId", type, content, "userId", "userName", metadata)
      VALUES (${id}, 'file', ${`Прикреплен файл: ${name}`}, ${user.userId}, ${user.name}, ${JSON.stringify({ fileId: file.id })})
    `
    console.log("[v0] Deal event created successfully")

    return NextResponse.json({ data: file })
  } catch (error: any) {
    console.error("[v0] ===== FILES API ERROR =====")
    console.error("[v0] Error message:", error.message)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
