import { NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if marketing_campaigns table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'MarketingCampaign'
      ) as exists
    `

    if (!tableCheck[0]?.exists) {
      // Table doesn't exist yet — return empty array
      return NextResponse.json([])
    }

    const campaigns = await sql`SELECT * FROM "MarketingCampaign" ORDER BY "createdAt" DESC`
    return NextResponse.json(campaigns)
  } catch (error) {
    console.error("Error fetching marketing campaigns:", error)
    return NextResponse.json([])
  }
}
