import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    // Защита через INTERNAL_API_KEY
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { phone, password } = await req.json()

    if (!phone || !password) {
      return NextResponse.json({ error: "Phone and password are required" }, { status: 400 })
    }

    // Генерируем bcrypt hash
    const passwordHash = await bcrypt.hash(password, 10)

    // Обновляем пользователя
    const user = await prisma.user.update({
      where: { phone },
      data: { passwordHash },
      select: { id: true, phone: true, name: true, role: true },
    })

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
      user,
    })
  } catch (error: any) {
    console.error("[v0] Error setting up super admin:", error)
    return NextResponse.json({ error: "Failed to setup super admin", details: error.message }, { status: 500 })
  }
}
