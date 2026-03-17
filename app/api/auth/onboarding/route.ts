import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { neon } from "@/lib/neon-compat"

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyRequest(request)
    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    await sql`
      UPDATE "User" SET "onboardingCompleted" = true, "updatedAt" = NOW()
      WHERE id = ${payload.userId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Onboarding complete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
