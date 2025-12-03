import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: { dealId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const deal = await prisma.deal.findUnique({
      where: { id: params.dealId },
      include: {
        responsible: { select: { id: true, name: true } },
        franchisee: { select: { id: true, name: true, city: true } },
        tasks: {
          include: {
            assigned: { select: { id: true, name: true } },
          },
        },
        assignments: {
          include: {
            personnel: true,
            assignedBy: { select: { id: true, name: true } },
          },
        },
        transaction: true,
      },
    })

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json(deal)
  } catch (error) {
    console.error("[DEAL_GET]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { dealId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Check if stage is changing to COMPLETED
    const currentDeal = await prisma.deal.findUnique({
      where: { id: params.dealId },
    })

    const deal = await prisma.deal.update({
      where: { id: params.dealId },
      data: body,
      include: {
        responsible: { select: { id: true, name: true } },
        franchisee: { select: { id: true, name: true, city: true } },
      },
    })

    // Auto-create transaction if moved to COMPLETED
    if (body.stage === "COMPLETED" && currentDeal?.stage !== "COMPLETED") {
      const revenue = deal.participants * deal.checkPerPerson
      const fot = deal.animatorsCount * deal.animatorRate + deal.hostRate + deal.djRate
      const royalty = Math.floor(revenue * 0.07)

      await prisma.transaction.create({
        data: {
          dealId: deal.id,
          franchiseeId: deal.franchiseeId,
          date: deal.gameDate || new Date(),
          participants: deal.participants,
          checkPerPerson: deal.checkPerPerson,
          revenue,
          fot,
          royalty,
        },
      })
    }

    return NextResponse.json(deal)
  } catch (error) {
    console.error("[DEAL_PATCH]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { dealId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "franchisee" && session.user.role !== "uk") {
      return NextResponse.json({ error: "Forbidden: Only franchisee and UK can delete deals" }, { status: 403 })
    }

    await prisma.deal.delete({
      where: { id: params.dealId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DEAL_DELETE]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
