import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "uk") {
      return NextResponse.json({ error: "Forbidden - Only UK can set KPIs" }, { status: 403 })
    }

    const body = await request.json()
    const { franchiseeIds, periodType, periodYear, periodNumber, targetRevenue, targetGames, maxExpenses } = body

    // Validate required fields
    if (!franchiseeIds || !Array.isArray(franchiseeIds) || franchiseeIds.length === 0) {
      return NextResponse.json({ error: "Franchisee IDs array required" }, { status: 400 })
    }

    if (!periodType || !periodYear || !periodNumber) {
      return NextResponse.json({ error: "Missing required period fields" }, { status: 400 })
    }

    // Validate at least one KPI is set
    if (!targetRevenue && !targetGames) {
      return NextResponse.json({ error: "At least one KPI target required (revenue or games)" }, { status: 400 })
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

    // Create KPI for each selected franchisee
    const kpis = await Promise.all(
      franchiseeIds.map((franchiseeId: string) =>
        prisma.franchiseeKPI.create({
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
        }),
      ),
    )

    console.log(`[v0] Bulk KPI assigned to ${kpis.length} franchisees`)

    return NextResponse.json({
      success: true,
      count: kpis.length,
      kpis,
    })
  } catch (error) {
    console.error("[KPI_BULK_POST]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
