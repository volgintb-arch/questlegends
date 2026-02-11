import { verifyRequest } from "@/lib/simple-auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"

// This endpoint will be called by a cron job or webhook
export async function POST(request: Request) {
  try {
    // Verify this is an internal request or has proper API key
    const apiKey = request.headers.get("x-api-key")
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { type } = body // TWO_DAYS_BEFORE or AFTER_GAME

    const now = new Date()
    let deals

    if (type === "TWO_DAYS_BEFORE") {
      // Find deals that are 2 days away
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
      const startOfDay = new Date(twoDaysFromNow.setHours(0, 0, 0, 0))
      const endOfDay = new Date(twoDaysFromNow.setHours(23, 59, 59, 999))

      deals = await prisma.deal.findMany({
        where: {
          gameDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          stage: "SCHEDULED",
          clientTelegram: {
            not: null,
          },
        },
        include: {
          franchisee: {
            include: {
              telegramTemplates: {
                where: {
                  type: "TWO_DAYS_BEFORE",
                  isActive: true,
                },
              },
            },
          },
        },
      })
    } else if (type === "AFTER_GAME") {
      // Find deals that were completed today
      const startOfDay = new Date(now.setHours(0, 0, 0, 0))
      const endOfDay = new Date(now.setHours(23, 59, 59, 999))

      deals = await prisma.deal.findMany({
        where: {
          stage: "COMPLETED",
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          clientTelegram: {
            not: null,
          },
        },
        include: {
          franchisee: {
            include: {
              telegramTemplates: {
                where: {
                  type: "AFTER_GAME",
                  isActive: true,
                },
              },
            },
          },
        },
      })
    }

    if (!deals || deals.length === 0) {
      return successResponse({ sent: 0, message: "No deals to notify" })
    }

    // Send notifications via Telegram Bot API
    const notifications = await Promise.allSettled(
      deals.map(async (deal) => {
        const template = deal.franchisee.telegramTemplates[0]
        if (!template || !deal.clientTelegram) {
          return null
        }

        // Replace placeholders in message
        let message = template.message
        message = message.replace("{clientName}", deal.clientName)
        message = message.replace("{gameDate}", deal.gameDate?.toLocaleDateString("ru-RU") || "")
        message = message.replace("{participants}", deal.participants.toString())

        // Send via Telegram Bot API
        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: deal.clientTelegram,
            text: message,
            parse_mode: "HTML",
          }),
        })

        if (!response.ok) {
          console.error(`Failed to send notification to ${deal.clientTelegram}`)
          return null
        }

        return deal.id
      }),
    )

    const successCount = notifications.filter((n) => n.status === "fulfilled" && n.value).length

    return successResponse({
      sent: successCount,
      total: deals.length,
      message: `Successfully sent ${successCount} notifications`,
    })
  } catch (error) {
    console.error("[NOTIFICATIONS_SEND]", error)
    return errorResponse("Failed to send notifications", 500)
  }
}
