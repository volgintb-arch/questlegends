import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await params

    // Получаем информацию о файле из базы данных
    const files = await sql`
      SELECT kf.* FROM "KnowledgeFile" kf
      WHERE kf.id = ${fileId}
    `

    if (files.length === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const file = files[0]

    // Проксируем файл через наш сервер
    const response = await fetch(file.url)

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 })
    }

    const arrayBuffer = await response.arrayBuffer()

    // Определяем Content-Type
    let contentType = file.mimeType || "application/octet-stream"
    if (file.name.endsWith(".pdf")) {
      contentType = "application/pdf"
    } else if (file.name.match(/\.(jpg|jpeg)$/i)) {
      contentType = "image/jpeg"
    } else if (file.name.endsWith(".png")) {
      contentType = "image/png"
    } else if (file.name.endsWith(".gif")) {
      contentType = "image/gif"
    } else if (file.name.endsWith(".mp4")) {
      contentType = "video/mp4"
    } else if (file.name.endsWith(".webm")) {
      contentType = "video/webm"
    }

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error) {
    console.error("[v0] Error proxying file:", error)
    return NextResponse.json({ error: "Failed to proxy file" }, { status: 500 })
  }
}
