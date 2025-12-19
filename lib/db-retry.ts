import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
}

/**
 * Executes SQL query with automatic retry on rate limit errors (429)
 */
export async function executeWithRetry<T>(query: string, params: any[] = [], options: RetryOptions = {}): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000 } = options

  let lastError: Error | null = null
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await sql(query, params)
      return result as T
    } catch (error: any) {
      lastError = error

      // Check if it's a rate limit error
      const errorMessage = error?.message || String(error)
      const isRateLimit =
        errorMessage.includes("Too Many Requests") ||
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit")

      // If it's the last attempt or not a rate limit error, throw immediately
      if (attempt === maxRetries || !isRateLimit) {
        throw error
      }

      // Wait before retrying with exponential backoff
      console.log(`[v0] DB retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * 2, maxDelay)
    }
  }

  throw lastError || new Error("Query failed after retries")
}

/**
 * Helper to check if error is a rate limit error
 */
export function isRateLimitError(error: any): boolean {
  const errorMessage = error?.message || String(error)
  return (
    errorMessage.includes("Too Many Requests") || errorMessage.includes("429") || errorMessage.includes("rate limit")
  )
}
