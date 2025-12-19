import { NextResponse, type NextRequest } from "next/server"
import crypto from "crypto"

const suspiciousIPs = new Map<string, { attempts: number; blockedUntil: number }>()
const requestPatterns = new Map<string, { count: number; windowStart: number }>()

const SQL_INJECTION_PATTERNS = [
  /(%27)|(')|(--)|(%23)|(#)/i,
  /((%3D)|(=))[^\n]*((%27)|(')|(--)|(%3B)|(;))/i,
  /\w*((%27)|('))((%6F)|o|(%4F))((%72)|r|(%52))/i,
  /((%27)|('))union/i,
  /exec(\s|\+)+(s|x)p\w+/i,
]

const XSS_PATTERNS = [/<script[^>]*>.*?<\/script>/gi, /javascript:/gi, /on\w+\s*=/gi, /<iframe/gi, /<object/gi]

export function detectSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input))
}

export function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(input))
}

export function sanitizeHTML(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

export function getClientIP(request: NextRequest | Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  const cfIP = request.headers.get("cf-connecting-ip")

  return cfIP || realIP || forwarded?.split(",")[0] || "unknown"
}

export function checkIPBlacklist(ip: string): NextResponse | null {
  const record = suspiciousIPs.get(ip)

  if (record && record.blockedUntil > Date.now()) {
    const remainingTime = Math.ceil((record.blockedUntil - Date.now()) / 1000)
    return NextResponse.json(
      {
        error: "IP адрес временно заблокирован",
        code: "IP_BLOCKED",
        remainingTime,
      },
      { status: 403 },
    )
  }

  return null
}

export function recordSuspiciousActivity(ip: string, reason: string) {
  const record = suspiciousIPs.get(ip) || { attempts: 0, blockedUntil: 0 }

  record.attempts++
  console.warn(`[v0 Security] Suspicious activity from ${ip}: ${reason} (attempt ${record.attempts})`)

  if (record.attempts >= 5) {
    record.blockedUntil = Date.now() + 3600000
    console.error(`[v0 Security] IP ${ip} blocked for 1 hour due to repeated violations`)
  }

  suspiciousIPs.set(ip, record)
}

export function detectAnomalousPattern(ip: string, endpoint: string): boolean {
  const key = `${ip}:${endpoint}`
  const now = Date.now()
  const pattern = requestPatterns.get(key)

  if (!pattern || now - pattern.windowStart > 10000) {
    requestPatterns.set(key, { count: 1, windowStart: now })
    return false
  }

  pattern.count++

  if (pattern.count > 50) {
    recordSuspiciousActivity(ip, `Anomalous pattern: ${pattern.count} requests to ${endpoint} in 10s`)
    return true
  }

  return false
}

export function validateRequestBody(body: any, requiredFields: string[]): NextResponse | null {
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Неверный формат данных", code: "INVALID_BODY" }, { status: 400 })
  }

  const missing = requiredFields.filter((field) => !(field in body))

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "Отсутствуют обязательные поля",
        code: "MISSING_FIELDS",
        missing,
      },
      { status: 400 },
    )
  }

  for (const field of requiredFields) {
    const value = body[field]
    if (typeof value === "string") {
      if (detectSQLInjection(value)) {
        return NextResponse.json({ error: "Обнаружена попытка SQL инъекции", code: "SQL_INJECTION" }, { status: 400 })
      }
      if (detectXSS(value)) {
        return NextResponse.json({ error: "Обнаружена попытка XSS атаки", code: "XSS_ATTACK" }, { status: 400 })
      }
    }
  }

  return null
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function validateCSRFToken(token: string | null, expected: string | null): boolean {
  if (!token || !expected) return false
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}

setInterval(() => {
  const now = Date.now()

  for (const [ip, record] of suspiciousIPs.entries()) {
    if (record.blockedUntil < now && record.attempts < 5) {
      suspiciousIPs.delete(ip)
    } else if (record.blockedUntil < now) {
      record.attempts = Math.max(0, record.attempts - 1)
    }
  }

  for (const [key, pattern] of requestPatterns.entries()) {
    if (now - pattern.windowStart > 60000) {
      requestPatterns.delete(key)
    }
  }
}, 60000)

export function logSecurityEvent(
  event: "auth_failure" | "sql_injection" | "xss_attempt" | "rate_limit" | "ip_blocked" | "anomalous_pattern",
  details: Record<string, any>,
) {
  console.warn(`[v0 Security Event] ${event}:`, JSON.stringify(details))
}
