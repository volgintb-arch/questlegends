import { verifyRequest } from "@/lib/simple-auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"
import { z } from "zod"

const b2bTaskSchema = z.object({
  b2bDealId: z.string(),
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

    // Only UK and UK employees can access B2B tasks
    if (!["super_admin", "uk", "uk_employee"].includes(user.role)) {
      return errorResponse("Access denied", 403)
    }

    const { searchParams } = new URL(request.url)
    const b2bDealId = searchParams.get("b2bDealId")
    const assignedToMe = searchParams.get("assignedToMe") === "true"

    const where: any = {}

    if (b2bDealId) {
      where.b2bDealId = b2bDealId
    }

    if (assignedToMe) {
      where.assignedToUserId = user.userId
    }

    const tasks = await prisma.b2BTask.findMany({
      where,
      include: {
        b2bDeal: {
          select: {
            id: true,
            companyName: true,
            stage: true,
            contactPerson: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
            telegramId: true,
            isUKEmployee: true,
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
    console.error("[B2B_TASKS_GET]")
    return errorResponse("Failed to fetch B2B tasks", 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only UK can create B2B tasks
    if (!["super_admin", "uk", "uk_employee"].includes(user.role)) {
      return errorResponse("Only UK can create B2B tasks", 403)
    }

    const body = await request.json()
    const validation = b2bTaskSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse("Invalid task data", 400)
    }

    const { b2bDealId, title, description, assignedToUserId, startTime, dueTime } = validation.data

    // Verify B2B deal exists
    const b2bDeal = await prisma.b2BDeal.findUnique({
      where: { id: b2bDealId },
    })

    if (!b2bDeal) {
      return errorResponse("B2B deal not found", 404)
    }

    // If assigning to someone, verify they are a UK employee
    if (assignedToUserId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: assignedToUserId,
          isUKEmployee: true,
        },
      })

      if (!assignee) {
        return errorResponse("Assignee must be a UK employee", 400)
      }
    }

    // Create task
    const task = await prisma.b2BTask.create({
      data: {
        b2bDealId,
        title,
        description,
        assignedToUserId,
        createdByUserId: user.userId,
        startTime: startTime ? new Date(startTime) : null,
        dueTime: dueTime ? new Date(dueTime) : null,
      },
      include: {
        b2bDeal: true,
        assignedTo: true,
        createdBy: true,
      },
    })

    // Create activity record
    await prisma.b2BDealActivity.create({
      data: {
        b2bDealId,
        type: "task_created",
        content: `Создана задача: ${title}`,
        userId: user.userId,
        userName: user.name || "",
      },
    })

    // Send Telegram notification if assigned user has telegram_id
    if (task.assignedTo?.telegramId) {
      await sendB2BTaskNotification(task, b2bDeal)
    }

    return successResponse(task, 201)
  } catch (error) {
    console.error("[B2B_TASKS_POST]")
    return errorResponse("Failed to create B2B task", 500)
  }
}

async function sendB2BTaskNotification(task: any, deal: any) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) return

    const stageLabels: Record<string, string> = {
      INITIAL_CONTACT: "Первичный контакт",
      PRESENTATION: "Презентация",
      NEGOTIATION: "Переговоры",
      DOCUMENTATION: "Оформление документов",
      SIGNED: "Договор подписан",
      REJECTED: "Отказ",
    }

    const message = `
🔔 *Новая задача B2B*

📋 *Задача:* ${task.title}
${task.description ? `📝 *Описание:* ${task.description}\n` : ""}
🏢 *Компания:* ${deal.companyName}
👤 *Контакт:* ${deal.contactPerson}
📊 *Стадия сделки:* ${stageLabels[deal.stage] || deal.stage}
${task.startTime ? `⏰ *Начало:* ${new Date(task.startTime).toLocaleString("ru-RU")}\n` : ""}
${task.dueTime ? `⏳ *Дедлайн:* ${new Date(task.dueTime).toLocaleString("ru-RU")}\n` : ""}
📈 *Статус:* Не выполнена
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
    console.error("[B2B_TELEGRAM_NOTIFICATION]")
  }
}
