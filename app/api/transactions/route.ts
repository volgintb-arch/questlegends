import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: any = {}

    if (session.user.role === "franchisee" || session.user.role === "admin") {
      where.franchiseeId = session.user.franchiseeId
    } else if (franchiseeId) {
      where.franchiseeId = franchiseeId
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            clientName: true,
          },
        },
        franchisee: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("[TRANSACTIONS_GET]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
