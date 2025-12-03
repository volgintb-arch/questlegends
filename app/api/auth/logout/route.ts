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

    return NextResponse.json({ success: true, message: "Logged out successfully" })
  } catch (error) {
    console.error("[LOGOUT_POST]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
