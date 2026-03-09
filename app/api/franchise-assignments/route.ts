import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    let assignments
    if (user.role === "uk_employee") {
      assignments = await sql`
        SELECT ufa.*, u.name as "userName", u.phone as "userPhone",
               f.name as "franchiseeName", f.city as "franchiseeCity"
        FROM "UserFranchiseeAssignment" ufa
        JOIN "User" u ON u.id = ufa."userId"
        JOIN "Franchisee" f ON f.id = ufa."franchiseeId"
        WHERE ufa."userId" = ${user.userId}
        ORDER BY f.name ASC
      `
    } else if (["franchisee", "own_point", "admin"].includes(user.role)) {
      // Franchisee/admin can see which UK employees are assigned to their franchisee
      const franchiseeId = user.franchiseeId
      if (!franchiseeId) {
        return NextResponse.json([])
      }
      assignments = await sql`
        SELECT ufa.*, u.name as "userName", u.phone as "userPhone", u.role as "userRole",
               f.name as "franchiseeName", f.city as "franchiseeCity"
        FROM "UserFranchiseeAssignment" ufa
        JOIN "User" u ON u.id = ufa."userId"
        JOIN "Franchisee" f ON f.id = ufa."franchiseeId"
        WHERE ufa."franchiseeId" = ${franchiseeId}
        ORDER BY u.name ASC
      `
    } else if (["super_admin", "uk"].includes(user.role)) {
      assignments = await sql`
        SELECT ufa.*, u.name as "userName", u.phone as "userPhone", u.role as "userRole",
               f.name as "franchiseeName", f.city as "franchiseeCity"
        FROM "UserFranchiseeAssignment" ufa
        JOIN "User" u ON u.id = ufa."userId"
        JOIN "Franchisee" f ON f.id = ufa."franchiseeId"
        ORDER BY f.name ASC, u.name ASC
      `
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(assignments)
  } catch (error: any) {
    console.error("[franchise-assignments] GET error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const { userId, franchiseeId } = body

    if (!userId || !franchiseeId) {
      return NextResponse.json({ error: "userId and franchiseeId required" }, { status: 400 })
    }

    // Check if assignment already exists
    const existing = await sql`
      SELECT id FROM "UserFranchiseeAssignment"
      WHERE "userId" = ${userId} AND "franchiseeId" = ${franchiseeId}
    `
    if (existing.length > 0) {
      return NextResponse.json({ error: "Assignment already exists" }, { status: 409 })
    }

    const id = globalThis.crypto.randomUUID()
    const result = await sql`
      INSERT INTO "UserFranchiseeAssignment" (id, "userId", "franchiseeId", "createdAt")
      VALUES (${id}, ${userId}, ${franchiseeId}, NOW())
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error: any) {
    console.error("[franchise-assignments] POST error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["super_admin", "uk"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get("id")

    if (!assignmentId) {
      return NextResponse.json({ error: "Assignment id required" }, { status: 400 })
    }

    await sql`DELETE FROM "UserFranchiseeAssignment" WHERE id = ${assignmentId}`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[franchise-assignments] DELETE error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
