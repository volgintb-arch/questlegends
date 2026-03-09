import { verifyRequest } from "@/lib/simple-auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only UK can update B2B tasks
    if (!["super_admin", "uk", "uk_employee"].includes(user.role)) {
      return errorResponse("Only UK can update B2B tasks", 403)
    }

    const { taskId } = await params
    const body = await request.json()
    const { title, description, assignedToUserId, startTime, dueTime, status, rescheduledTime, rescheduledReason } =
      body

    const existingTask = await prisma.b2BTask.findUnique({
      where: { id: taskId },
      include: {
        b2bDeal: true,
        assignedTo: true,
      },
    })

    if (!existingTask) {
      return errorResponse("Task not found", 404)
    }

    // If assigning to someone new, verify they are a UK employee
    if (assignedToUserId && assignedToUserId !== existingTask.assignedToUserId) {
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

    const updateData: any = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (assignedToUserId !== undefined) updateData.assignedToUserId = assignedToUserId
    if (startTime !== undefined) updateData.startTime = startTime ? new Date(startTime) : null
    if (dueTime !== undefined) updateData.dueTime = dueTime ? new Date(dueTime) : null
    if (status !== undefined) updateData.status = status
    if (rescheduledTime !== undefined) updateData.rescheduledTime = rescheduledTime ? new Date(rescheduledTime) : null
    if (rescheduledReason !== undefined) updateData.rescheduledReason = rescheduledReason

    const updatedTask = await prisma.b2BTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        b2bDeal: true,
        assignedTo: true,
        createdBy: true,
      },
    })

    // Create activity record
    let activityContent = "Задача обновлена"
    if (status === "COMPLETED") {
      activityContent = `Задача выполнена: ${updatedTask.title}`
    } else if (status === "RESCHEDULED") {
      activityContent = `Задача перенесена: ${updatedTask.title}`
    } else if (status === "IN_PROGRESS") {
      activityContent = `Задача в работе: ${updatedTask.title}`
    }

    await prisma.b2BDealActivity.create({
      data: {
        b2bDealId: existingTask.b2bDealId,
        type: "task_updated",
        content: activityContent,
        userId: user.userId,
        userName: user.name || "",
      },
    })

    // Send Telegram notification on status change
    if (status && status !== existingTask.status && updatedTask.assignedTo?.telegramId) {
      await sendB2BTaskUpdateNotification(updatedTask, existingTask.b2bDeal, status)
    }

    return successResponse(updatedTask)
  } catch (error) {
    console.error("[B2B_TASK_PATCH]")
    return errorResponse("Failed to update B2B task", 500)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await verifyRequest(request as any)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only UK can delete B2B tasks
    if (!["super_admin", "uk", "uk_employee"].includes(user.role)) {
      return errorResponse("Only UK can delete B2B tasks", 403)
    }

    const { taskId } = await params
    const task = await prisma.b2BTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return errorResponse("Task not found", 404)
    }

    await prisma.b2BTask.delete({
      where: { id: taskId },
    })

    // Create activity record
    await prisma.b2BDealActivity.create({
      data: {
        b2bDealId: task.b2bDealId,
        type: "task_deleted",
        content: `Задача удалена: ${task.title}`,
        userId: user.userId,
        userName: user.name || "",
      },
    })

    return successResponse({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("[B2B_TASK_DELETE]")
    return errorResponse("Failed to delete B2B task", 500)
  }
}

async function sendB2BTaskUpdateNotification(task: any, deal: any, newStatus: string) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) return

    const statusLabels: Record<string, string> = {
      NOT_STARTED: "Не выполнена",
      IN_PROGRESS: "В работе",
      RESCHEDULED: "Перенесена",
      COMPLETED: "Выполнена",
    }

    let icon = "📊"
    if (newStatus === "COMPLETED") icon = "✅"
    if (newStatus === "IN_PROGRESS") icon = "🔄"
    if (newStatus === "RESCHEDULED") icon = "⏰"

    const message = `
${icon} *Обновление задачи B2B*

📋 *Задача:* ${task.title}
🏢 *Компания:* ${deal.companyName}
📈 *Новый статус:* ${statusLabels[newStatus]}
${task.rescheduledTime ? `📅 *Перенесено на:* ${new Date(task.rescheduledTime).toLocaleString("ru-RU")}\n` : ""}
${task.rescheduledReason ? `💬 *Причина:* ${task.rescheduledReason}` : ""}
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
    console.error("[B2B_TASK_UPDATE_NOTIFICATION]")
  }
}
