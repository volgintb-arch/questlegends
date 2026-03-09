/**
 * Compatibility shim: replaces @neondatabase/serverless with local postgres.
 * All existing code using neon() continues to work without changes.
 *
 * Supports three calling patterns used across the codebase:
 *  1. Tagged template:  sql`SELECT * FROM "User" WHERE id = ${id}`
 *  2. Function call:    sql(queryString, paramsArray)
 *  3. Method call:      sql.query(queryString, paramsArray)  → returns { rows, rowCount }
 */
import postgres from "postgres"

// Singleton connection pool reused across all requests
let _pool: ReturnType<typeof postgres> | null = null

function getPool(): ReturnType<typeof postgres> {
  if (!_pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL is not defined")
    const isLocalhost = url.includes("localhost") || url.includes("127.0.0.1")
    _pool = postgres(url, {
      max: 20,
      ssl: isLocalhost ? false : { rejectUnauthorized: true },
      idle_timeout: 30,
      connect_timeout: 10,
    })
  }
  return _pool
}

type SqlProxy = ReturnType<typeof postgres> & {
  query: (queryStr: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number }>
}

function createProxy(): SqlProxy {
  const pool = getPool()

  return new Proxy(pool, {
    apply(_target, _thisArg, args) {
      const first = args[0]
      // Tagged template: first arg is TemplateStringsArray (has .raw property)
      if (first && Array.isArray(first) && "raw" in first) {
        return pool(first as TemplateStringsArray, ...args.slice(1))
      }
      // Function call: sql(queryString, paramsArray)
      if (typeof first === "string") {
        return pool.unsafe(first, (args[1] as any[]) || [])
      }
      // Fallback
      return pool(first, ...args.slice(1))
    },
    get(target, prop, receiver) {
      // sql.query(queryString, paramsArray) → { rows, rowCount }
      if (prop === "query") {
        return async (queryStr: string, params?: any[]) => {
          const result = await pool.unsafe(queryStr, params || [])
          return { rows: Array.from(result), rowCount: result.length }
        }
      }
      return Reflect.get(target, prop, receiver)
    },
  }) as SqlProxy
}

/**
 * Drop-in replacement for neon(url) from @neondatabase/serverless.
 * Returns a proxied SQL function that supports tagged templates,
 * sql(string, array), and sql.query(string, array).
 */
export function neon(_url?: string): SqlProxy {
  return createProxy()
}

// Also export sql as a convenience (same singleton)
export const sql = getPool
