import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json([])
    }

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")
    if (!sessionCookie) {
      return NextResponse.json([])
    }

    const session = JSON.parse(sessionCookie.value)
    const sql = neon(databaseUrl)

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7)

    // Get salary data for the month
    // For now return empty array as salary calculation is not implemented yet
    return NextResponse.json([])
  } catch (error) {
    console.error("[v0] Personnel salary error:", error)
    return NextResponse.json([])
  }
}
