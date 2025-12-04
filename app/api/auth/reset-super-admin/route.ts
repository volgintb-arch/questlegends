import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { apiKey } = body

    // Простая защита endpoint
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Generating bcrypt hash for admin123...")

    // Генерируем хэш для пароля admin123
    const hashedPassword = await bcrypt.hash("admin123", 10)
    console.log("[v0] Generated hash:", hashedPassword)

    // Обновляем пароль супер-админа
    const updatedUser = await prisma.user.update({
      where: { phone: "+79000000000" },
      data: { password: hashedPassword },
    })

    console.log("[v0] Updated user:", updatedUser.phone)

    return NextResponse.json({
      success: true,
      message: "Super admin password updated successfully",
      hash: hashedPassword,
    })
  } catch (error: any) {
    console.error("[v0] Error updating super admin password:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to update password",
      },
      { status: 500 },
    )
  }
}
