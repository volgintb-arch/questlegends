import { type NextRequest, NextResponse } from "next/server"

/**
 * Validates server-to-server auth via INTEGRATION_API_KEY.
 * Returns null on success, or a NextResponse with 401/503 on failure.
 *
 * Used by /api/leads/by-yclid, /api/leads/recent, etc. Bot uses the same key.
 */
export function checkIntegrationAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.INTEGRATION_API_KEY
  if (!expected) {
    return NextResponse.json(
      { error: "INTEGRATION_API_KEY is not configured on server" },
      { status: 503 },
    )
  }
  const auth = req.headers.get("authorization") || ""
  const provided = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
