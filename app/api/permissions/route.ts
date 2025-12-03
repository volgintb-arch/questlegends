import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    // Get all users with permissions for the franchisee
    const users = await prisma.user.findMany({
      where: {
        franchiseeId: franchiseeId || undefined,
        role: { in: ["admin", "uk_employee", "employee"] },
        isActive: true,
      },
      include: {
        userPermissions: true,
        franchisee: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("[v0] Error fetching permissions:", error)
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, permissions } = body

    if (!userId || !permissions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Update or create user permissions
    const userPermission = await prisma.userPermission.upsert({
      where: { userId },
      update: {
        ...permissions,
        updatedAt: new Date(),
      },
      create: {
        userId,
        ...permissions,
      },
    })

    return NextResponse.json({ permission: userPermission })
  } catch (error) {
    console.error("[v0] Error updating permissions:", error)
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 })
  }
}
