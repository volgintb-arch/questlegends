import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (session?.user?.id) {
      // Delete all refresh tokens for this user
      await prisma.refreshToken.deleteMany({
        where: {
          userId: session.user.id,
        },
      })
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" })

    response.cookies.delete("auth-token")

    return response
  } catch (error) {
    console.error("[v0] Logout error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
