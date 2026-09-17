import { type NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

/**
 * Internal-only password setup. Guarded by INTERNAL_API_KEY.
 *
 * Fail-closed: if the key is not configured the endpoint is disabled.
 * Previously the check compared against the literal string "Bearer undefined"
 * when the env var was unset, so that exact header value passed.
 */
function keyMatches(authHeader: string | null): boolean {
  const expected = process.env.INTERNAL_API_KEY
  if (!expected || !authHeader || !authHeader.startsWith("Bearer ")) return false
  const a = Buffer.from(authHeader.slice(7))
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Endpoint disabled" }, { status: 503 })
    }

    if (!keyMatches(req.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { phone, password } = await req.json()

    if (!phone || !password) {
      return NextResponse.json({ error: "Phone and password are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { phone },
      data: { passwordHash },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
