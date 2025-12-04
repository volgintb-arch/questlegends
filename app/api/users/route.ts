import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")

    const where: any = {}

    if (session.user.role === "franchisee" || session.user.role === "admin") {
      where.franchiseeId = session.user.franchiseeId
    } else if (franchiseeId) {
      where.franchiseeId = franchiseeId
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        telegram: true,
        whatsapp: true,
        telegramId: true,
        description: true,
        isActive: true,
        createdAt: true,
        permissions: true,
        franchisee: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("[USERS_GET]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Creating new user - start")

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log("[v0] No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Session user:", session.user.id, session.user.role)

    const body = await request.json()
    console.log("[v0] Request body:", JSON.stringify(body, null, 2))

    const {
      phone,
      name,
      role,
      telegram,
      whatsapp,
      telegramId,
      description,
      permissions,
      password,
      franchiseeId,
      email,
      city,
    } = body

    if (!name || !role) {
      return NextResponse.json({ error: "Name and role are required" }, { status: 400 })
    }

    if (role === "franchisee" && !city) {
      return NextResponse.json({ error: "City is required for franchisee role" }, { status: 400 })
    }

    if (["animator", "host", "dj", "admin"].includes(role) && !franchiseeId && !session.user.franchiseeId) {
      return NextResponse.json({ error: "Franchisee is required for admin and personnel roles" }, { status: 400 })
    }

    // Strict RBAC validation
    if (session.user.role === "admin") {
      if (!["animator", "host", "dj"].includes(role)) {
        return NextResponse.json(
          { error: "Admins can only create personnel roles (animator, host, dj)" },
          { status: 403 },
        )
      }
    }

    if (session.user.role === "franchisee") {
      if (!["admin", "animator", "host", "dj"].includes(role)) {
        return NextResponse.json({ error: "Franchisee can only create admin and personnel roles" }, { status: 403 })
      }
    }

    if (session.user.role === "uk") {
      if (!["franchisee", "uk_employee"].includes(role)) {
        return NextResponse.json({ error: "UK can only create franchisee and uk_employee roles" }, { status: 403 })
      }
    }

    const userEmail =
      email ||
      (phone
        ? `${phone.replace(/\D/g, "")}@questlegends.com`
        : `${name.toLowerCase().replace(/\s+/g, ".")}@questlegends.com`)

    // Generate password
    const tempPassword = password || Math.random().toString(36).slice(-8)
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    let userFranchiseeId = franchiseeId || session.user.franchiseeId

    if (role === "franchisee" && city && session.user.role === "uk") {
      console.log("[v0] Creating franchisee record for city:", city)

      const newFranchisee = await prisma.franchisee.create({
        data: {
          name: `${city} - ${name}`,
          city: city,
          address: `г. ${city}`,
        },
      })

      console.log("[v0] Franchisee created:", newFranchisee.id)
      userFranchiseeId = newFranchisee.id
    }

    if (session.user.role === "uk" && role === "uk_employee") {
      userFranchiseeId = null
    }

    const finalRole = ["animator", "host", "dj"].includes(role) ? "employee" : role

    console.log("[v0] Creating user with role:", finalRole, "email:", userEmail, "franchiseeId:", userFranchiseeId)

    const user = await prisma.user.create({
      data: {
        phone,
        email: userEmail,
        passwordHash,
        name,
        role: finalRole,
        telegram,
        whatsapp,
        telegramId,
        description,
        franchiseeId: userFranchiseeId,
        permissions:
          role === "admin" && permissions
            ? {
                create: permissions,
              }
            : undefined,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        telegram: true,
        whatsapp: true,
        telegramId: true,
        permissions: true,
      },
    })

    console.log("[v0] User created successfully:", user.id)

    if (["animator", "host", "dj"].includes(role) && userFranchiseeId) {
      console.log("[v0] Creating personnel record for user:", user.id)
      await prisma.personnel.create({
        data: {
          franchiseeId: userFranchiseeId,
          name,
          role: role as "animator" | "host" | "dj",
          phone,
          telegram,
          whatsapp,
          userId: user.id,
        },
      })
      console.log("[v0] Personnel record created")
    }

    return NextResponse.json({ user, tempPassword })
  } catch (error: any) {
    console.error("[v0] USERS_POST error:", error)
    return NextResponse.json({ error: "Internal error", details: error.message }, { status: 500 })
  }
}
