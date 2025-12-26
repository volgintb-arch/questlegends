import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { del } from "@vercel/blob"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    // Get file info from database
    const [file] = await sql`
      SELECT url, name, type FROM "DealFile" WHERE id = ${fileId}
    `

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const fileResponse = await fetch(file.url, {
      headers: {
        Accept: "*/*",
      },
    })

    if (!fileResponse.ok) {
      console.error("[v0] Blob fetch failed:", fileResponse.status, fileResponse.statusText)
      return NextResponse.json({ error: "Failed to fetch file from storage" }, { status: 500 })
    }

    const arrayBuffer = await fileResponse.arrayBuffer()

    // Determine content type
    const contentType = file.type || fileResponse.headers.get("content-type") || "application/octet-stream"

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
    console.error("[v0] Error downloading file:", error)
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

    // Get file info
    const [file] = await sql`
      SELECT id, url, name, "dealId" FROM "DealFile" WHERE id = ${fileId}
    `

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Delete from Blob Storage
    try {
      await del(file.url)
    } catch (blobError) {
      console.error("[v0] Error deleting from blob:", blobError)
      // Continue to delete from database even if blob deletion fails
    }

    // Delete from database
    await sql`DELETE FROM "DealFile" WHERE id = ${fileId}`

    // Create event for file deletion
    await sql`
      INSERT INTO "DealEvent" (id, "dealId", type, content, "userId", "createdAt")
      VALUES (
        ${crypto.randomUUID()},
        ${file.dealId},
        'file_deleted',
        ${"Удален файл: " + file.name},
        ${user.userId},
        NOW()
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
