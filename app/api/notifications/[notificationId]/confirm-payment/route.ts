import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only UK roles can confirm payment
    if (!["uk", "uk_employee", "super_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { notificationId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    // Get the notification to extract the royalty marker
    const notifications = await sql`
      SELECT * FROM "Notification"
      WHERE id = ${notificationId} AND type = 'royalty_payment'
    `

    if (notifications.length === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    const notification = notifications[0]

    // Extract the marker [royalty:franchiseeId:YYYY-MM] from message
    const markerMatch = notification.message.match(/\[royalty:([^:]+):([^\]]+)\]/)
    if (!markerMatch) {
      return NextResponse.json({ error: "Invalid royalty notification" }, { status: 400 })
    }

    const marker = markerMatch[0]

    // Archive ALL royalty_payment notifications with this same marker (for all recipients)
    await sql`
      UPDATE "Notification"
      SET "isArchived" = true, "isRead" = true, "updatedAt" = NOW()
      WHERE type = 'royalty_payment'
        AND message LIKE ${"%" + marker + "%"}
    `

    return NextResponse.json({ success: true, message: "Royalty payment confirmed" })
  } catch (error: any) {
    console.error("[v0] CONFIRM_PAYMENT error:", error?.message || error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
