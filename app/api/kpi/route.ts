import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET all KPIs for a franchisee
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    if (!franchiseeId) {
      return NextResponse.json({ error: "Franchisee ID required" }, { status: 400 })
    }

    const kpis = await prisma.franchiseeKPI.findMany({
      where: { franchiseeId },
      include: {
        franchisee: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
      orderBy: {
        periodStart: "desc",
      },
    })

    return NextResponse.json(kpis)
  } catch (error) {
    console.error("[KPI_GET]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// POST create new KPI
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "uk") {
      return NextResponse.json({ error: "Forbidden - Only UK can set KPIs" }, { status: 403 })
    }

    const body = await request.json()
    const { franchiseeId, periodType, periodYear, periodNumber, targetRevenue, targetGames, maxExpenses } = body

    // Validate required fields
    if (!franchiseeId || !periodType || !periodYear || !periodNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate period type
    if (!["month", "quarter", "year"].includes(periodType)) {
      return NextResponse.json({ error: "Invalid period type" }, { status: 400 })
    }

    // Validate period number
    if (periodType === "month" && (periodNumber < 1 || periodNumber > 12)) {
      return NextResponse.json({ error: "Invalid month number (1-12)" }, { status: 400 })
    }
    if (periodType === "quarter" && (periodNumber < 1 || periodNumber > 4)) {
      return NextResponse.json({ error: "Invalid quarter number (1-4)" }, { status: 400 })
    }

    const kpi = await prisma.franchiseeKPI.create({
      data: {
        franchiseeId,
        periodType,
        periodYear: Number.parseInt(periodYear),
        periodNumber: Number.parseInt(periodNumber),
        targetRevenue: targetRevenue ? Number.parseInt(targetRevenue) : null,
        targetGames: targetGames ? Number.parseInt(targetGames) : null,
        maxExpenses: maxExpenses ? Number.parseInt(maxExpenses) : null,
        setByUserId: session.user.id,
      },
      include: {
        franchisee: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    })

    return NextResponse.json(kpi)
  } catch (error) {
    console.error("[KPI_POST]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// DELETE KPI
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "uk") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const kpiId = searchParams.get("id")

    if (!kpiId) {
      return NextResponse.json({ error: "KPI ID required" }, { status: 400 })
    }

    await prisma.franchiseeKPI.delete({
      where: { id: kpiId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[KPI_DELETE]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
