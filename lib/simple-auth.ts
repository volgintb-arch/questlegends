// Secure token verification using HMAC-SHA256 signatures.
// Tokens are signed JSON payloads — they cannot be forged without the secret.

export interface TokenPayload {
  userId: string
  phone: string
  name: string
  role: string
  franchiseeId?: string
  exp: number
  iat: number
}

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET environment variable is not set")
  }
  return secret
}

async function hmacSign(data: string, secret: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data))
    return Buffer.from(sig).toString("base64url")
  }
  // Node.js fallback
  const { createHmac } = await import("crypto")
  return createHmac("sha256", secret).update(data).digest("base64url")
}

async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(data, secret)
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

export async function createSignedToken(payload: Omit<TokenPayload, "exp" | "iat">): Promise<string> {
  const secret = getSecret()
  const full: TokenPayload = {
    ...payload,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  }
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const body = Buffer.from(JSON.stringify(full)).toString("base64url")
  const sig = await hmacSign(`${header}.${body}`, secret)
  return `${header}.${body}.${sig}`
}

export async function verifySimpleToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = getSecret()
    const parts = token.split(".")

    if (parts.length === 3) {
      // New signed format: header.payload.signature
      const [header, body, sig] = parts
      const valid = await hmacVerify(`${header}.${body}`, sig, secret)
      if (!valid) return null
      const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as TokenPayload
      if (payload.exp && Date.now() > payload.exp) return null
      return payload
    }

    // Legacy unsigned base64 tokens are no longer accepted.
    // All clients must re-authenticate to obtain a signed token.
    return null
  } catch {
    return null
  }
}

// Synchronous wrapper kept for backward compatibility where await is unavailable.
// Returns null for legacy unsigned tokens — forces re-authentication.
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    // We cannot verify the HMAC synchronously here — reject and require the caller
    // to use the async verifySimpleToken instead.
    // This method intentionally returns null to avoid accepting unverified tokens.
    return null
  } catch {
    return null
  }
}

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
