import { neon } from "@neondatabase/serverless"

// Singleton SQL client with retry logic
class DatabaseClient {
  private static instance: DatabaseClient
  private sql: ReturnType<typeof neon>

  private constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not defined")
    }
    this.sql = neon(process.env.DATABASE_URL)
  }

  static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient()
    }
    return DatabaseClient.instance
  }

  /**
   * Execute query with automatic retry on rate limit errors (429)
   */
  async query<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T> {
    const maxRetries = 3
    const initialDelay = 1000
    const maxDelay = 10000

    let lastError: Error | null = null
    let delay = initialDelay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Execute the query using template literal
        const result = await this.sql(strings, ...values)
        return result as T
      } catch (error: any) {
        lastError = error

        // Check if it's a rate limit error
        const errorMessage = error?.message || String(error)
        const isRateLimit =
          errorMessage.includes("Too Many Requests") ||
          errorMessage.includes("429") ||
          errorMessage.includes("rate limit") ||
          errorMessage.includes("too many requests")

        // If it's the last attempt or not a rate limit error, throw immediately
        if (attempt === maxRetries || !isRateLimit) {
          throw error
        }

        // Log retry attempt
        console.log(`[DB Retry] Attempt ${attempt + 1}/${maxRetries} after ${delay}ms (rate limit detected)`)

        // Wait before retrying with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay))

        // Increase delay for next attempt (exponential backoff)
        delay = Math.min(delay * 2, maxDelay)
      }
    }

    throw lastError || new Error("Query failed after retries")
  }

  /**
   * Get raw SQL client (use only if absolutely needed)
   */
  getRawClient() {
    return this.sql
  }
}

// Export singleton instance for template literal usage
const dbInstance = DatabaseClient.getInstance()

// Export as tagged template function that can be used like: sql`SELECT * FROM users`
export const sql = new Proxy(
  (strings: TemplateStringsArray, ...values: any[]) => {
    return dbInstance.query(strings, ...values)
  },
  {
    // Allow calling sql.transaction, sql.query, etc if needed
    get(target, prop) {
      if (prop === "query") {
        return (strings: TemplateStringsArray, ...values: any[]) => dbInstance.query(strings, ...values)
      }
      // For any other properties, return from the raw client
      const rawClient = dbInstance.getRawClient()
      return (rawClient as any)[prop]
    },
  },
)

export default sql
