import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Test API: Starting")

    // Test 1: Check environment variables
    const hasDbUrl = !!process.env.DATABASE_URL
    console.log("[v0] Test API: Has DATABASE_URL:", hasDbUrl)

    // Test 2: Try to import prisma
    let prismaImportSuccess = false
    let prismaError = null
    try {
      const { prisma } = await import("@/lib/prisma")
      prismaImportSuccess = true
      console.log("[v0] Test API: Prisma imported successfully")

      // Test 3: Try a simple query
      const userCount = await prisma.user.count()
      console.log("[v0] Test API: User count:", userCount)

      return NextResponse.json({
        success: true,
        tests: {
          hasDbUrl,
          prismaImportSuccess,
          userCount,
        },
      })
    } catch (e) {
      prismaError = e instanceof Error ? e.message : String(e)
      console.error("[v0] Test API: Prisma error:", prismaError)

      return NextResponse.json(
        {
          success: false,
          tests: {
            hasDbUrl,
            prismaImportSuccess,
            error: prismaError,
          },
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Test API: Fatal error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
