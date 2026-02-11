import { NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"

export async function POST(request: Request) {
  try {
    const user = await verifyRequest(request as any)

    // Token-based logout - just clear cookies, no DB cleanup needed

    const response = NextResponse.json({ success: true, message: "Logged out successfully" })

    response.cookies.delete("auth-token")

    return response
  } catch (error) {
    console.error("[v0] Logout error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
