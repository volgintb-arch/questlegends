import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { readFile, unlink } from "fs/promises"
import path from "path"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fileId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    const [file] = await sql`
      SELECT url, name, type FROM "DealFile" WHERE id = ${fileId}
    `

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    let arrayBuffer: ArrayBuffer
    let contentType = file.type || "application/octet-stream"

    if (file.url.startsWith("/uploads/")) {
      // Локальный файл — читаем из public/uploads
      const filePath = path.join(process.cwd(), "public", file.url)
      const buffer = await readFile(filePath)
      arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    } else {
      // Внешний URL (старые Vercel Blob файлы) — пробуем fetch
      const fileResponse = await fetch(file.url, {
        headers: { Accept: "*/*" },
      })
      if (!fileResponse.ok) {
        console.error("[v0] External file fetch failed:", fileResponse.status, fileResponse.statusText)
        return NextResponse.json({ error: "Failed to fetch file from storage" }, { status: 500 })
      }
      arrayBuffer = await fileResponse.arrayBuffer()
      contentType = file.type || fileResponse.headers.get("content-type") || "application/octet-stream"
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

    const [file] = await sql`
      SELECT id, url, name, "dealId" FROM "DealFile" WHERE id = ${fileId}
    `

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Удаляем файл из хранилища
    if (file.url.startsWith("/uploads/")) {
      try {
        const filePath = path.join(process.cwd(), "public", file.url)
        await unlink(filePath)
      } catch (fsError) {
        console.error("[v0] Error deleting local file:", fsError)
      }
    }

    // Удаляем из базы
    await sql`DELETE FROM "DealFile" WHERE id = ${fileId}`

    // Создаём событие удаления
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
    console.error("[v0] Error deleting file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
