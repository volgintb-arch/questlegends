import { createHmac } from "crypto"

// JWT для admin-запросов от questlegends к seeker-passport.
// Формат — стандартный HS256 JWT, seeker валидирует общим секретом
// SEEKER_JWT_SECRET. Отделён от NEXTAUTH_SECRET, чтобы взлом одного
// сервиса не тянул за собой другой.

export type SeekerAdminClaims = {
  sub: string // userId в questlegends
  name?: string
  role: string
  franchiseeId?: string | null
  citySlug?: string | null
}

function base64urlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function signSeekerAdminJWT(claims: SeekerAdminClaims, ttlSeconds = 300): string {
  const secret = process.env.SEEKER_JWT_SECRET
  if (!secret) throw new Error("SEEKER_JWT_SECRET is not set")

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    ...claims,
    iss: "questlegends",
    aud: "seeker-passport",
    iat: now,
    exp: now + ttlSeconds,
  }
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = base64urlEncode(JSON.stringify(payload))
  const sig = base64urlEncode(createHmac("sha256", secret).update(`${header}.${body}`).digest())
  return `${header}.${body}.${sig}`
}
