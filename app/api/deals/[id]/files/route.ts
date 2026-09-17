import { neon } from "@/lib/neon-compat"
import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { canAccessFranchisee } from "@/lib/tenant"

const sql = neon(process.env.DATABASE_URL!)

/** Only urls produced by /api/upload (local) or legacy Vercel Blob objects are accepted. */
function isAcceptableFileUrl(url: unknown): url is string {
  if (typeof url !== "string") return false
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(url)) return true
  try {
    const u = new URL(url)
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

/** 403 unless the caller may access the deal that owns these files. */
async function assertDealAccess(user: { role: string; franchiseeId?: string | null }, dealId: string) {
  const [deal] = await sql`SELECT "franchiseeId" FROM "Deal" WHERE id = ${dealId}`
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })
  if (!canAccessFranchisee(user, deal.franchiseeId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }
  return null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const denied = await assertDealAccess(user, id)
    if (denied) return denied

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
    const denied = await assertDealAccess(user, id)
    if (denied) return denied

    const body = await request.json()

    const { name, url, type, size } = body

    if (!name || !url) {
      return NextResponse.json({ error: "Missing required fields: name and url" }, { status: 400 })
    }
    // The url is later used as a filesystem path / fetch target by /api/files.
    // Accept only what our own uploader produces.
    if (!isAcceptableFileUrl(url)) {
      return NextResponse.json({ error: "Invalid file url" }, { status: 400 })
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
