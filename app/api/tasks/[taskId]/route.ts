import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils/response"
import { z } from "zod"

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "RESCHEDULED", "COMPLETED"]).optional(),
  assignedToUserId: z.string().optional(),
  startTime: z.string().optional(),
  dueTime: z.string().optional(),
  rescheduledTime: z.string().optional(),
  rescheduledReason: z.string().optional(),
})

export async function PATCH(request: Request, { params }: { params: { taskId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse("Invalid update data", 400)
    }

    const task = await prisma.dealTask.findUnique({
      where: { id: params.taskId },
      include: {
        deal: {
          include: {
            franchisee: true,
          },
        },
      },
    })

    if (!task) {
      return errorResponse("Task not found", 404)
    }

    // Check access
    if (session.user.role !== "uk" && task.deal.franchiseeId !== session.user.franchiseeId) {
      return errorResponse("Forbidden", 403)
    }

    const updateData: any = {}

    if (validation.data.title) updateData.title = validation.data.title
    if (validation.data.description !== undefined) updateData.description = validation.data.description
    if (validation.data.status) updateData.status = validation.data.status
    if (validation.data.assignedToUserId !== undefined) updateData.assignedToUserId = validation.data.assignedToUserId
    if (validation.data.startTime) updateData.startTime = new Date(validation.data.startTime)
    if (validation.data.dueTime) updateData.dueTime = new Date(validation.data.dueTime)
    if (validation.data.rescheduledTime) updateData.rescheduledTime = new Date(validation.data.rescheduledTime)
    if (validation.data.rescheduledReason !== undefined)
      updateData.rescheduledReason = validation.data.rescheduledReason

    const updatedTask = await prisma.dealTask.update({
      where: { id: params.taskId },
      data: updateData,
      include: {
        deal: true,
        assignedTo: true,
        createdBy: true,
      },
    })

    return successResponse(updatedTask)
  } catch (error) {
    console.error("[TASK_PATCH]", error)
    return errorResponse("Failed to update task", 500)
  }
}

export async function DELETE(request: Request, { params }: { params: { taskId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return unauthorizedResponse()
    }

    const task = await prisma.dealTask.findUnique({
      where: { id: params.taskId },
      include: {
        deal: true,
      },
    })

    if (!task) {
      return errorResponse("Task not found", 404)
    }

    // Check access
    if (session.user.role !== "uk" && task.deal.franchiseeId !== session.user.franchiseeId) {
      return errorResponse("Forbidden", 403)
    }

    await prisma.dealTask.delete({
      where: { id: params.taskId },
    })

    return successResponse({ message: "Task deleted" })
  } catch (error) {
    console.error("[TASK_DELETE]", error)
    return errorResponse("Failed to delete task", 500)
  }
}
