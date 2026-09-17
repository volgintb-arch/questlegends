import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

/**
 * Internal-only password reset. Guarded by INTERNAL_API_KEY.
 *
 * Fail-closed: if the key is not configured the endpoint is disabled.
 * Previously `apiKey !== process.env.INTERNAL_API_KEY` passed when both sides
 * were undefined, i.e. with the env var unset anyone could reset any password.
 */
function keyMatches(provided: unknown): boolean {
  const expected = process.env.INTERNAL_API_KEY
  if (!expected || typeof provided !== "string") return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  try {
    if (!process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Endpoint disabled" }, { status: 503 })
    }

    const body = await request.json()
    const { apiKey, phone, password } = body

    if (!keyMatches(apiKey)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!phone || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Phone and password (min 8 chars) are required" },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { phone },
      data: { passwordHash: hashedPassword },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
