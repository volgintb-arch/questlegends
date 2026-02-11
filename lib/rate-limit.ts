/**
 * In-memory rate limiter for brute-force protection.
 * Uses a sliding window approach per identifier (e.g. IP or phone+IP).
 *
 * For production with multiple server instances, replace with
 * @upstash/ratelimit + @upstash/redis for distributed rate limiting.
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

const attempts = new Map<string, RateLimitRecord>()

// Periodically clean up expired entries to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, record] of attempts.entries()) {
    if (now > record.resetAt) {
      attempts.delete(key)
    }
  }
}

/**
 * Check if an identifier has exceeded the rate limit.
 *
 * @param identifier - Unique key (e.g. IP address, "login:phone:ip")
 * @param maxAttempts - Maximum allowed attempts within the window (default: 5)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns { success: boolean, remaining: number, resetAt: number }
 */
export function rateLimit(
  identifier: string,
  maxAttempts = 5,
  windowMs = 60000,
): { success: boolean; remaining: number; resetAt: number } {
  cleanup()

  const now = Date.now()
  const record = attempts.get(identifier)

  // First request or window expired
  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs
    attempts.set(identifier, { count: 1, resetAt })
    return { success: true, remaining: maxAttempts - 1, resetAt }
  }

  // Within window, check count
  if (record.count >= maxAttempts) {
    return { success: false, remaining: 0, resetAt: record.resetAt }
  }

  record.count++
  return {
    success: true,
    remaining: maxAttempts - record.count,
    resetAt: record.resetAt,
  }
}
