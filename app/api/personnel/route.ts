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

    const where: any = { isActive: true }

    if (session.user.role === "franchisee" || session.user.role === "admin" || session.user.role === "employee") {
      where.franchiseeId = session.user.franchiseeId
    } else if (franchiseeId) {
      where.franchiseeId = franchiseeId
    }

    const personnel = await prisma.personnel.findMany({
      where,
      include: {
        assignments: {
          include: {
            deal: {
              select: {
                id: true,
                title: true,
                gameDate: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(personnel)
  } catch (error) {
    console.error("[PERSONNEL_GET]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const personnel = await prisma.personnel.create({
      data: {
        ...body,
        franchiseeId: session.user.franchiseeId,
      },
    })

    return NextResponse.json(personnel)
  } catch (error) {
    console.error("[PERSONNEL_POST]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
