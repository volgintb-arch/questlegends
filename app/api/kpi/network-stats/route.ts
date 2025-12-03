import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "uk") {
      return NextResponse.json({ error: "Forbidden - UK only" }, { status: 403 })
    }

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    // Get all KPIs for current month
    const kpis = await prisma.franchiseeKPI.findMany({
      where: {
        periodType: "month",
        periodNumber: currentMonth,
        periodYear: currentYear,
      },
      include: {
        franchisee: {
          select: {
            name: true,
            city: true,
          },
        },
      },
    })

    // Calculate network statistics
    const totalTargetRevenue = kpis.reduce((sum, kpi) => sum + (kpi.targetRevenue || 0), 0)
    const totalActualRevenue = kpis.reduce((sum, kpi) => sum + (kpi.actualRevenue || 0), 0)
    const totalTargetGames = kpis.reduce((sum, kpi) => sum + (kpi.targetGames || 0), 0)
    const totalActualGames = kpis.reduce((sum, kpi) => sum + (kpi.actualGames || 0), 0)

    // Calculate plan fulfillment percentage
    const planFulfillment = totalTargetRevenue > 0 ? (totalActualRevenue / totalTargetRevenue) * 100 : 0

    // Calculate franchisees meeting their targets
    const franchiseesMeetingTargets = kpis.filter(
      (kpi) =>
        (kpi.targetRevenue ? kpi.actualRevenue >= kpi.targetRevenue : true) &&
        (kpi.targetGames ? kpi.actualGames >= kpi.targetGames : true),
    ).length

    const satisfactionRate = kpis.length > 0 ? (franchiseesMeetingTargets / kpis.length) * 100 : 0

    // Get average rating from completed deals
    const completedDeals = await prisma.deal.findMany({
      where: {
        stage: "COMPLETED",
        createdAt: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1),
        },
      },
    })

    // In real app, you'd have ratings in Deal model. For now, calculate based on completion rate
    const averageRating = completedDeals.length > 0 ? 4.5 + (satisfactionRate / 100) * 0.5 : 0

    return NextResponse.json({
      success: true,
      stats: {
        averageRating: Number.parseFloat(averageRating.toFixed(1)),
        satisfactionRate: Number.parseFloat(satisfactionRate.toFixed(0)),
        planFulfillment: Number.parseFloat(planFulfillment.toFixed(0)),
        totalFranchisees: kpis.length,
        franchiseesMeetingTargets,
        totalTargetRevenue,
        totalActualRevenue,
        totalTargetGames,
        totalActualGames,
      },
    })
  } catch (error) {
    console.error("[NETWORK_STATS_GET]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
