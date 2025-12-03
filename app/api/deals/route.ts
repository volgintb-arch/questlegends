import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { dealSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, validationErrorResponse, unauthorizedResponse } from "@/lib/utils/response"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const franchiseeId = searchParams.get("franchiseeId")
    const stage = searchParams.get("stage")

    const where: any = {}

    // Filter by role
    if (session.user.role === "franchisee" || session.user.role === "admin" || session.user.role === "employee") {
      where.franchiseeId = session.user.franchiseeId
    } else if (franchiseeId) {
      where.franchiseeId = franchiseeId
    }

    if (stage) {
      where.stage = stage
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        responsible: { select: { id: true, name: true } },
        franchisee: { select: { id: true, name: true, city: true } },
        tasks: true,
        assignments: {
          include: {
            personnel: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return successResponse(deals)
  } catch (error) {
    console.error("[DEALS_GET]", error)
    return errorResponse("Failed to fetch deals", 500)
  }
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Creating new deal - start")

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log("[v0] No session found")
      return unauthorizedResponse()
    }

    console.log("[v0] Session user:", session.user.id, session.user.role)

    const body = await request.json()
    console.log("[v0] Request body:", JSON.stringify(body, null, 2))

    const validation = dealSchema.safeParse(body)
    if (!validation.success) {
      console.log("[v0] Validation failed:", validation.error.errors)
      return validationErrorResponse(validation.error.errors)
    }

    console.log("[v0] Validation passed")

    const franchiseeId = session.user.franchiseeId || body.franchiseeId
    if (!franchiseeId) {
      console.log("[v0] No franchiseeId found")
      return errorResponse("Franchisee ID is required", 400)
    }

    console.log("[v0] Creating deal with franchiseeId:", franchiseeId)

    const deal = await prisma.deal.create({
      data: {
        clientName: validation.data.clientName,
        clientPhone: validation.data.clientPhone || null,
        clientTelegram: validation.data.clientTelegram || null,
        clientWhatsapp: validation.data.clientWhatsapp || null,
        gameType: validation.data.gameType || null,
        location: validation.data.location || null,
        gameDate: validation.data.gameDate ? new Date(validation.data.gameDate) : null,
        participants: validation.data.participants || null,
        packageType: validation.data.packageType || null,
        price: validation.data.price || null,
        stage: validation.data.stage || "NEW",
        discount: validation.data.discount || null,
        source: validation.data.source || null,
        description: validation.data.description || null,
        franchiseeId,
        responsibleId: session.user.id,
      },
      include: {
        responsible: { select: { id: true, name: true } },
        franchisee: { select: { id: true, name: true, city: true } },
      },
    })

    console.log("[v0] Deal created successfully:", deal.id)

    return NextResponse.json(deal, { status: 201 })
  } catch (error: any) {
    console.error("[v0] DEALS_POST error:", error)
    return errorResponse(`Failed to create deal: ${error.message}`, 500)
  }
}
