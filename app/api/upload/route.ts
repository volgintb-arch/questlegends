import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "video/mp4",
  "video/webm",
])

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads")

export async function POST(request: NextRequest) {
  const user = await verifyRequest(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "File type not allowed." }, { status: 400 })
    }

    await mkdir(UPLOAD_DIR, { recursive: true })

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeName}`
    const filePath = path.join(UPLOAD_DIR, uniqueName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    return NextResponse.json({
      success: true,
      url: `/uploads/${uniqueName}`,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("[upload] POST error")
    return NextResponse.json({ success: false, error: "Failed to upload file" }, { status: 500 })
  }
}
