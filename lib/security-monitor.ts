import { NextResponse } from "next/server"

interface SecurityEvent {
  timestamp: number
  ip: string
  type: "sql_injection" | "xss" | "rate_limit" | "invalid_auth" | "suspicious_pattern"
  details: string
  severity: "low" | "medium" | "high" | "critical"
}

interface IPRecord {
  violations: number
  lastViolation: number
  blockedUntil: number | null
}

const securityEvents: SecurityEvent[] = []
const ipRecords = new Map<string, IPRecord>()
const BLOCK_DURATION = 3600000
const MAX_VIOLATIONS = 5
const EVENT_RETENTION = 86400000

export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)/i,
    /(\bselect\b.*\bfrom\b.*\bwhere\b)/i,
    /(\bdrop\b.*\btable\b)/i,
    /(\binsert\b.*\binto\b)/i,
    /(\bdelete\b.*\bfrom\b)/i,
    /(\bupdate\b.*\bset\b)/i,
    /(\bexec\b.*\()/i,
    /(\bor\b.*=.*)/i,
    /('.*--)/,
    /(;.*drop)/i,
  ]

  return sqlPatterns.some((pattern) => pattern.test(input))
}

export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /eval\(/i,
    /expression\(/i,
  ]

  return xssPatterns.some((pattern) => pattern.test(input))
}

export function detectPathTraversal(input: string): boolean {
  const pathPatterns = [/\.\.[/\\]/, /\.\.%2[fF]/, /\.\.%5[cC]/]

  return pathPatterns.some((pattern) => pattern.test(input))
}

export function logSecurityEvent(event: Omit<SecurityEvent, "timestamp">): void {
  securityEvents.push({
    ...event,
    timestamp: Date.now(),
  })

  const record = ipRecords.get(event.ip) || { violations: 0, lastViolation: 0, blockedUntil: null }
  record.violations++
  record.lastViolation = Date.now()

  if (record.violations >= MAX_VIOLATIONS && event.severity === "high") {
    record.blockedUntil = Date.now() + BLOCK_DURATION
  }

  ipRecords.set(event.ip, record)

  console.error(`[SECURITY] ${event.severity.toUpperCase()}: ${event.type} from ${event.ip} - ${event.details}`)
}

export function isIPBlocked(ip: string): boolean {
  const record = ipRecords.get(ip)
  if (!record || !record.blockedUntil) return false

  if (Date.now() > record.blockedUntil) {
    record.blockedUntil = null
    record.violations = 0
    ipRecords.set(ip, record)
    return false
  }

  return true
}

export function checkRequestSecurity(request: Request, body?: any): NextResponse | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown"

  if (isIPBlocked(ip)) {
    return NextResponse.json(
      { error: "Ваш IP адрес временно заблокирован из-за подозрительной активности", code: "IP_BLOCKED" },
      { status: 403 },
    )
  }

  const url = new URL(request.url)
  const searchParams = url.searchParams.toString()

  if (detectSQLInjection(searchParams)) {
    logSecurityEvent({
      ip,
      type: "sql_injection",
      details: `SQL injection attempt in URL: ${searchParams}`,
      severity: "critical",
    })
    return NextResponse.json({ error: "Обнаружена попытка SQL инъекции", code: "SQL_INJECTION" }, { status: 400 })
  }

  if (detectXSS(searchParams)) {
    logSecurityEvent({
      ip,
      type: "xss",
      details: `XSS attempt in URL: ${searchParams}`,
      severity: "high",
    })
    return NextResponse.json({ error: "Обнаружена попытка XSS атаки", code: "XSS_ATTEMPT" }, { status: 400 })
  }

  if (detectPathTraversal(url.pathname)) {
    logSecurityEvent({
      ip,
      type: "suspicious_pattern",
      details: `Path traversal attempt: ${url.pathname}`,
      severity: "high",
    })
    return NextResponse.json(
      { error: "Обнаружена попытка доступа к защищенным ресурсам", code: "PATH_TRAVERSAL" },
      { status: 400 },
    )
  }

  if (body && typeof body === "object") {
    const bodyString = JSON.stringify(body)
    if (detectSQLInjection(bodyString)) {
      logSecurityEvent({
        ip,
        type: "sql_injection",
        details: "SQL injection attempt in request body",
        severity: "critical",
      })
      return NextResponse.json({ error: "Обнаружена попытка SQL инъекции", code: "SQL_INJECTION" }, { status: 400 })
    }

    if (detectXSS(bodyString)) {
      logSecurityEvent({
        ip,
        type: "xss",
        details: "XSS attempt in request body",
        severity: "high",
      })
      return NextResponse.json({ error: "Обнаружена попытка XSS атаки", code: "XSS_ATTEMPT" }, { status: 400 })
    }
  }

  return null
}

export function getSecurityStats() {
  const now = Date.now()
  const recentEvents = securityEvents.filter((e) => now - e.timestamp < 3600000)

  return {
    totalEvents: securityEvents.length,
    recentEvents: recentEvents.length,
    blockedIPs: Array.from(ipRecords.entries())
      .filter(([_, record]) => record.blockedUntil && record.blockedUntil > now)
      .map(([ip, record]) => ({
        ip,
        violations: record.violations,
        blockedUntil: new Date(record.blockedUntil!).toISOString(),
      })),
    eventsByType: recentEvents.reduce(
      (acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ),
  }
}

setInterval(() => {
  const now = Date.now()
  const validEvents = securityEvents.filter((e) => now - e.timestamp < EVENT_RETENTION)
  securityEvents.length = 0
  securityEvents.push(...validEvents)

  for (const [ip, record] of ipRecords.entries()) {
    if (record.blockedUntil && now > record.blockedUntil) {
      record.blockedUntil = null
      record.violations = 0
    }
    if (now - record.lastViolation > EVENT_RETENTION) {
      ipRecords.delete(ip)
    }
  }
}, 60000)
