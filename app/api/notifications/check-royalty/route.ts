import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const today = new Date()
    const dayOfMonth = today.getDate()
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()

    // Find all franchisees where today is the royalty payment day
    const franchisees = await sql`
      SELECT f.id, f.name, f.city, f."royaltyPercent", f."royaltyPaymentDay"
      FROM "Franchisee" f
      WHERE f."royaltyPaymentDay" = ${dayOfMonth}
    `

    if (franchisees.length === 0) {
      return NextResponse.json({ success: true, created: 0, message: "No royalty payments due today" })
    }

    let createdCount = 0
    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`

    for (const franchisee of franchisees) {
      // Check if royalty notification already exists for this franchisee this month
      // We use a unique marker in the message to prevent duplicates
      const marker = `[royalty:${franchisee.id}:${monthKey}]`

      const existing = await sql`
        SELECT id FROM "Notification"
        WHERE type = 'royalty_payment'
          AND message LIKE ${"%" + marker + "%"}
          AND "isArchived" = false
      `

      if (existing.length > 0) {
        continue // Already created for this month
      }

      // Find UK employees assigned to this franchisee
      const assignedEmployees = await sql`
        SELECT ufa."userId", u.name, u.role
        FROM "UserFranchiseeAssignment" ufa
        JOIN "User" u ON u.id = ufa."userId"
        WHERE ufa."franchiseeId" = ${franchisee.id}
          AND u.role IN ('uk_employee', 'uk', 'super_admin')
      `

      // Find franchisee users (owners)
      const franchiseeUsers = await sql`
        SELECT id, name, role
        FROM "User"
        WHERE "franchiseeId" = ${franchisee.id}
          AND role IN ('franchisee', 'own_point')
      `

      // Also notify all UK users if no specific assignment
      let ukRecipients = assignedEmployees
      if (ukRecipients.length === 0) {
        ukRecipients = await sql`
          SELECT id as "userId", name, role
          FROM "User"
          WHERE role IN ('uk', 'super_admin')
        `
      }

      const now = new Date().toISOString()
      const title = `Оплата роялти: ${franchisee.name}`
      const messageForUk = `Франчайзи "${franchisee.name}" (${franchisee.city}) должен оплатить роялти ${franchisee.royaltyPercent}% за текущий месяц. ${marker}`
      const messageForFranchisee = `Сегодня день оплаты роялти (${franchisee.royaltyPercent}%). Пожалуйста, произведите оплату. ${marker}`

      // Create notifications for UK employees
      for (const emp of ukRecipients) {
        const id = globalThis.crypto.randomUUID()
        await sql`
          INSERT INTO "Notification" (
            id, type, title, message, "senderId", "recipientId",
            "isRead", "isArchived", "createdAt", "updatedAt"
          ) VALUES (
            ${id}, 'royalty_payment', ${title}, ${messageForUk},
            NULL, ${emp.userId}, false, false, ${now}, ${now}
          )
        `
        createdCount++
      }

      // Create notifications for franchisee users
      for (const fu of franchiseeUsers) {
        const id = globalThis.crypto.randomUUID()
        await sql`
          INSERT INTO "Notification" (
            id, type, title, message, "senderId", "recipientId",
            "isRead", "isArchived", "createdAt", "updatedAt"
          ) VALUES (
            ${id}, 'royalty_payment', ${title}, ${messageForFranchisee},
            NULL, ${fu.id}, false, false, ${now}, ${now}
          )
        `
        createdCount++
      }
    }

    return NextResponse.json({ success: true, created: createdCount })
  } catch (error: any) {
    console.error("[v0] CHECK_ROYALTY error:", error?.message || error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
