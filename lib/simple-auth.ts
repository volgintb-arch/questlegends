// Simple token verification without external dependencies
// Tokens are base64 encoded JSON objects

export interface TokenPayload {
  userId: string
  phone: string
  name: string
  role: string
  franchiseeId?: string
  exp: number
  iat: number
}

export function verifySimpleToken(token: string): TokenPayload | null {
  try {
    // Decode base64 token
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    const payload = JSON.parse(decoded) as TokenPayload

    // Check if token is expired
    if (payload.exp && Date.now() > payload.exp) {
      return null
    }

    return payload
  } catch (error) {
    return null
  }
}

export const verifyToken = verifySimpleToken

export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }
  return null
}

export async function verifyRequest(request: Request): Promise<TokenPayload | null> {
  const token = extractToken(request)
  if (!token) return null

  return verifySimpleToken(token)
}
