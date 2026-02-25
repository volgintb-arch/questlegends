import { NextResponse } from "next/server"

// This endpoint has been disabled for security reasons.
// Debug/test endpoints must not be accessible in production.
export async function GET() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 })
}
