import { verifyRequest } from "@/lib/simple-auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"
import { z } from "zod"

const taskSchema = z.object({
  dealId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  assignedToUserId: z.string().optional(),
  startTime: z.string().optional(),
  dueTime: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const dealId = searchParams.get("dealId")
    const assignedToMe = searchParams.get("assignedToMe") === "true"

    const where: any = {}

    if (dealId) {
      where.dealId = dealId
    }

    if (assignedToMe) {
      where.assignedToUserId = user.userId
    }

    // Filter by franchise for non-UK roles
    if (!["super_admin", "uk", "uk_employee"].includes(user.role)) {
      where.deal = {
        franchiseeId: user.franchiseeId,
      }
    }

    const tasks = await prisma.dealTask.findMany({
      where,
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            gameDate: true,
            clientName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
            telegramId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return successResponse(tasks)
  } catch (error) {
    console.error("[TASKS_GET]", error)
    return errorResponse("Failed to fetch tasks", 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const validation = taskSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse("Invalid task data", 400)
    }

    const { dealId, title, description, assignedToUserId, startTime, dueTime } = validation.data

    // Verify deal exists and user has access
    const deal = await prisma.deal.findFirst({
      where: {
        id: dealId,
        ...(!["super_admin", "uk", "uk_employee"].includes(user.role) && {
          franchiseeId: user.franchiseeId,
        }),
      },
      include: {
        franchisee: true,
      },
    })

    if (!deal) {
      return errorResponse("Deal not found", 404)
    }

    // Create task
    const task = await prisma.dealTask.create({
      data: {
        dealId,
        title,
        description,
        assignedToUserId,
        createdByUserId: user.userId,
        startTime: startTime ? new Date(startTime) : null,
        dueTime: dueTime ? new Date(dueTime) : null,
      },
      include: {
        deal: true,
        assignedTo: true,
        createdBy: true,
      },
    })

    // Send Telegram notification if assigned user has telegram_id
    if (task.assignedTo?.telegramId) {
      await sendTaskNotification(task, deal)
    }

    return successResponse(task, 201)
  } catch (error) {
    console.error("[TASKS_POST]", error)
    return errorResponse("Failed to create task", 500)
  }
}

async function sendTaskNotification(task: any, deal: any) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) return

    const message = `
🔔 *Новая задача*

📋 *Задача:* ${task.title}
${task.description ? `📝 *Описание:* ${task.description}\n` : ""}
🎮 *Игра:* ${deal.title}
👤 *Клиент:* ${deal.clientName}
📅 *Дата игры:* ${deal.gameDate ? new Date(deal.gameDate).toLocaleString("ru-RU") : "Не указана"}
${task.startTime ? `⏰ *Начало:* ${new Date(task.startTime).toLocaleString("ru-RU")}\n` : ""}
${task.dueTime ? `⏳ *Дедлайн:* ${new Date(task.dueTime).toLocaleString("ru-RU")}\n` : ""}
📊 *Статус:* Не выполнена
    `.trim()

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: task.assignedTo.telegramId,
        text: message,
        parse_mode: "Markdown",
      }),
    })
  } catch (error) {
    console.error("[TELEGRAM_NOTIFICATION]", error)
  }
}
