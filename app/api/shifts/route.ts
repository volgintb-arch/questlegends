import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/response"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching shifts for user:", session.user.id, "role:", session.user.role)

    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")
    const personnelId = searchParams.get("personnelId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: any = {}

    // Employee users (animator, host, dj) see only their own shifts
    if (session.user.role === "employee") {
      // Find personnel record linked to this user
      const personnel = await prisma.personnel.findFirst({
        where: { userId: session.user.id },
      })

      if (!personnel) {
        console.log("[v0] No personnel record found for user")
        return NextResponse.json([])
      }

      where.personnelId = personnel.id
    } else if (session.user.role === "franchisee" || session.user.role === "admin") {
      // Franchisee and admin see all shifts in their location
      where.franchiseeId = session.user.franchiseeId
    } else if (franchiseeId && session.user.role === "uk") {
      // UK can filter by franchisee
      where.franchiseeId = franchiseeId
    }

    if (personnelId) {
      where.personnelId = personnelId
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    console.log("[v0] Querying shifts with filter:", where)

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        personnel: { select: { id: true, name: true, role: true } },
        franchisee: { select: { id: true, name: true } },
        deal: {
          select: {
            id: true,
            title: true,
            clientName: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    })

    console.log("[v0] Found shifts:", shifts.length)

    return NextResponse.json(shifts)
  } catch (error) {
    console.error("[v0] SHIFTS_GET error:", error)
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return unauthorizedResponse()
    }

    // Only franchisee and admin can create shifts
    if (!["UK", "FRANCHISEE", "ADMIN"].includes(session.user.role)) {
      return forbiddenResponse()
    }

    const body = await request.json()

    const shift = await prisma.shift.create({
      data: {
        ...body,
        franchiseeId: session.user.franchiseeId || body.franchiseeId,
      },
      include: {
        personnel: { select: { id: true, name: true, role: true } },
      },
    })

    return successResponse(shift, 201)
  } catch (error) {
    console.error("[SHIFTS_POST]", error)
    return errorResponse("Failed to create shift", 500)
  }
}
