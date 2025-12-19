import { NextResponse } from "next/server"

const rateLimit = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string, maxRequests = 100, windowMs = 60000): NextResponse | null {
  const now = Date.now()
  const record = rateLimit.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimit.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return null
  }

  if (record.count >= maxRequests) {
    return NextResponse.json({ error: "Слишком много запросов. Попробуйте позже." }, { status: 429 })
  }

  record.count++
  return null
}

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimit.entries()) {
    if (now > value.resetTime) {
      rateLimit.delete(key)
    }
  }
}, 300000)
