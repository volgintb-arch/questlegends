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

    const where: any = {}

    if (session.user.role === "admin") {
      // Admin can only see expenses for their own franchisee
      where.franchiseeId = session.user.franchiseeId
    } else if (session.user.role === "franchisee") {
      // Franchisee can see their own expenses
      if (session.user.franchiseeId) {
        where.franchiseeId = session.user.franchiseeId
      } else if (session.user.franchiseeIds && session.user.franchiseeIds.length > 0) {
        where.franchiseeId = { in: session.user.franchiseeIds }
      }
    } else if (session.user.role === "uk") {
      // UK can see all or specific franchisee
      if (franchiseeId) {
        where.franchiseeId = franchiseeId
      }
    } else {
      // Other roles don't have access
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("[EXPENSES_GET]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "franchisee" && session.user.role !== "admin" && session.user.role !== "uk") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()

    let targetFranchiseeId = session.user.franchiseeId

    if (session.user.role === "franchisee" && session.user.franchiseeIds && session.user.franchiseeIds.length > 0) {
      targetFranchiseeId = session.user.franchiseeIds[0]
    }

    if (session.user.role === "uk" && body.franchiseeId) {
      targetFranchiseeId = body.franchiseeId
    }

    if (!targetFranchiseeId) {
      return NextResponse.json({ error: "Franchisee ID is required" }, { status: 400 })
    }

    const expense = await prisma.expense.create({
      data: {
        category: body.category,
        amount: body.amount,
        date: new Date(body.date),
        description: body.description,
        fileUrl: body.fileUrl,
        franchiseeId: targetFranchiseeId,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error("[EXPENSES_POST]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
