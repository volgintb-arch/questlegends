import { type NextRequest, NextResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only UK role can send messages to franchisees
    if (session.user.role !== "uk") {
      return NextResponse.json({ error: "Forbidden: Only UK can send messages" }, { status: 403 })
    }

    const { franchiseeId, message } = await req.json()

    if (!franchiseeId || !message) {
      return NextResponse.json({ error: "Missing franchiseeId or message" }, { status: 400 })
    }

    // Get franchisee owner user with telegram ID
    const franchiseeUser = await prisma.user.findFirst({
      where: {
        franchiseeId,
        role: "franchisee",
        isActive: true,
        telegramId: { not: null },
      },
      select: {
        id: true,
        name: true,
        telegramId: true,
        franchisee: {
          select: {
            name: true,
            city: true,
          },
        },
      },
    })

    if (!franchiseeUser || !franchiseeUser.telegramId) {
      return NextResponse.json(
        {
          error: "Franchisee not found or Telegram ID not configured",
          message: "Пользователь франчайзи не настроил Telegram ID. Попросите его добавить Telegram ID в профиле.",
        },
        { status: 404 },
      )
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      console.error("[TELEGRAM] Bot token not configured")
      return NextResponse.json(
        {
          error: "Telegram bot not configured",
          message: "Telegram бот не настроен. Обратитесь к администратору системы.",
        },
        { status: 500 },
      )
    }

    // Format message with sender info
    const formattedMessage = `📨 *Сообщение от Управляющей Компании*\n\n${message}\n\n_Отправитель: ${session.user.name}_\n_Франшиза: ${franchiseeUser.franchisee?.name} (${franchiseeUser.franchisee?.city})_`

    // Send message via Telegram Bot API
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: franchiseeUser.telegramId,
        text: formattedMessage,
        parse_mode: "Markdown",
      }),
    })

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json()
      console.error("[TELEGRAM] Failed to send message:", errorData)

      return NextResponse.json(
        {
          error: "Failed to send Telegram message",
          message: "Не удалось отправить сообщение в Telegram. Проверьте правильность Telegram ID.",
          details: errorData,
        },
        { status: 500 },
      )
    }

    const result = await telegramResponse.json()

    return NextResponse.json({
      success: true,
      message: "Сообщение успешно отправлено в Telegram",
      recipient: franchiseeUser.name,
      franchisee: franchiseeUser.franchisee?.name,
      telegramMessageId: result.result.message_id,
    })
  } catch (error) {
    console.error("[TELEGRAM_SEND_MESSAGE]", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
