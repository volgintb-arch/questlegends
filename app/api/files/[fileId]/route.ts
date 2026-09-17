import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { readFile, unlink } from "fs/promises"
import path from "path"
import { verifyRequest } from "@/lib/simple-auth"
import { canAccessFranchisee } from "@/lib/tenant"

const UPLOADS_DIR = path.resolve(process.cwd(), "public", "uploads")

/**
 * Resolve a stored "/uploads/<name>" url to an absolute path inside UPLOADS_DIR.
 * Returns null if the url would escape the directory (".." etc.).
 * Previously `path.join(cwd, "public", file.url)` normalised ".." and could
 * read or unlink any file on the server.
 */
function resolveLocalUpload(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null
  const full = path.resolve(UPLOADS_DIR, path.basename(url))
  if (!full.startsWith(UPLOADS_DIR + path.sep)) return null
  return full
}

/** Legacy Vercel Blob objects are the only external urls we will fetch. */
function isAllowedExternalUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fileId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    const [file] = await sql`
      SELECT df.url, df.name, df.type, d."franchiseeId"
      FROM "DealFile" df
      LEFT JOIN "Deal" d ON d.id = df."dealId"
      WHERE df.id = ${fileId}
    `

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    if (!canAccessFranchisee(user, file.franchiseeId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    let arrayBuffer: ArrayBuffer
    let contentType = file.type || "application/octet-stream"

    const localPath = resolveLocalUpload(file.url)
    if (localPath) {
      const buffer = await readFile(localPath)
      arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    } else if (isAllowedExternalUrl(file.url)) {
      const fileResponse = await fetch(file.url, { headers: { Accept: "*/*" } })
      if (!fileResponse.ok) {
        console.error("[files] External file fetch failed:", fileResponse.status, fileResponse.statusText)
        return NextResponse.json({ error: "Failed to fetch file from storage" }, { status: 500 })
      }
      arrayBuffer = await fileResponse.arrayBuffer()
      contentType = file.type || fileResponse.headers.get("content-type") || "application/octet-stream"
    } else {
      console.error("[files] Refusing to serve file with unexpected url:", fileId)
      return NextResponse.json({ error: "File location is not allowed" }, { status: 400 })
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("[files] Error downloading file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fileId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    const [file] = await sql`
      SELECT df.id, df.url, df.name, df."dealId", d."franchiseeId"
      FROM "DealFile" df
      LEFT JOIN "Deal" d ON d.id = df."dealId"
      WHERE df.id = ${fileId}
    `

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    if (!canAccessFranchisee(user, file.franchiseeId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Remove from storage (local uploads only, inside UPLOADS_DIR)
    const localPath = resolveLocalUpload(file.url)
    if (localPath) {
      try {
        await unlink(localPath)
      } catch (fsError) {
        console.error("[files] Error deleting local file:", fsError)
      }
    }

    await sql`DELETE FROM "DealFile" WHERE id = ${fileId}`

    await sql`
      INSERT INTO "DealEvent" (id, "dealId", type, content, "userId", "createdAt")
      VALUES (
        ${globalThis.crypto.randomUUID()},
        ${file.dealId},
        'file_deleted',
        ${"Удален файл: " + file.name},
        ${user.userId},
        NOW()
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[files] Error deleting file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
