/**
 * Application Logger — серверное логирование ошибок и событий
 * Записывает в таблицу AppLog, доступную только super_admin/uk
 */

import { sql } from "@/lib/db"

export type LogLevel = "error" | "warn" | "info" | "debug"
export type LogSource = "api" | "webhook" | "integration" | "auth" | "cron" | "system" | "client"

export interface AppLogEntry {
  id: string
  level: LogLevel
  source: LogSource
  message: string
  stack: string | null
  url: string | null
  method: string | null
  statusCode: number | null
  userId: string | null
  metadata: Record<string, any> | null
  createdAt: string
}

/**
 * Записать лог в БД
 */
export async function logApp(params: {
  level: LogLevel
  source: LogSource
  message: string
  stack?: string | null
  url?: string | null
  method?: string | null
  statusCode?: number | null
  userId?: string | null
  metadata?: Record<string, any> | null
}): Promise<void> {
  try {
    const id = crypto.randomUUID()
    await sql`
      INSERT INTO "AppLog" (
        id, level, source, message, stack, url, method,
        "statusCode", "userId", metadata, "createdAt"
      ) VALUES (
        ${id},
        ${params.level},
        ${params.source},
        ${params.message.substring(0, 2000)},
        ${params.stack?.substring(0, 5000) || null},
        ${params.url || null},
        ${params.method || null},
        ${params.statusCode || null},
        ${params.userId || null},
        ${params.metadata ? JSON.stringify(params.metadata) : null},
        NOW()
      )
    `
  } catch (e) {
    // Не ломаем основной поток если логирование упало
    console.error("[AppLogger] Failed to write log:", e)
  }
}

/**
 * Логировать ошибку из API route
 */
export async function logApiError(
  error: unknown,
  request: { url?: string; method?: string },
  userId?: string | null,
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error))
  await logApp({
    level: "error",
    source: "api",
    message: err.message,
    stack: err.stack || null,
    url: request.url || null,
    method: request.method || null,
    statusCode: 500,
    userId: userId || null,
  })
}

/**
 * Логировать ошибку из вебхука
 */
export async function logWebhookError(
  channel: string,
  integrationId: string,
  error: unknown,
  payload?: any,
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error))
  await logApp({
    level: "error",
    source: "webhook",
    message: `[${channel}] ${err.message}`,
    stack: err.stack || null,
    url: `/api/webhooks/${channel}/${integrationId}`,
    method: "POST",
    metadata: { channel, integrationId, payloadKeys: payload ? Object.keys(payload) : null },
  })
}

/**
 * Логировать предупреждение
 */
export async function logWarning(
  source: LogSource,
  message: string,
  metadata?: Record<string, any>,
): Promise<void> {
  await logApp({ level: "warn", source, message, metadata })
}

/**
 * Логировать информационное событие
 */
export async function logInfo(
  source: LogSource,
  message: string,
  metadata?: Record<string, any>,
): Promise<void> {
  await logApp({ level: "info", source, message, metadata })
}

/**
 * Получить логи с пагинацией и фильтрами
 */
export async function getAppLogs(params: {
  page?: number
  limit?: number
  level?: LogLevel
  source?: LogSource
  search?: string
  dateFrom?: string
  dateTo?: string
}): Promise<{ logs: AppLogEntry[]; total: number }> {
  const { page = 1, limit = 50, level, source, search, dateFrom, dateTo } = params
  const offset = (page - 1) * limit

  const lvl = level || null
  const src = source || null
  const srch = search ? `%${search}%` : null
  const df = dateFrom || null
  const dt = dateTo || null

  const logs = await sql`
    SELECT * FROM "AppLog"
    WHERE (${lvl}::text IS NULL OR level = ${lvl})
      AND (${src}::text IS NULL OR source = ${src})
      AND (${srch}::text IS NULL OR message ILIKE ${srch})
      AND (${df}::timestamptz IS NULL OR "createdAt" >= ${df}::timestamptz)
      AND (${dt}::timestamptz IS NULL OR "createdAt" <= ${dt}::timestamptz)
    ORDER BY "createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countResult = await sql`
    SELECT COUNT(*) as count FROM "AppLog"
    WHERE (${lvl}::text IS NULL OR level = ${lvl})
      AND (${src}::text IS NULL OR source = ${src})
      AND (${srch}::text IS NULL OR message ILIKE ${srch})
      AND (${df}::timestamptz IS NULL OR "createdAt" >= ${df}::timestamptz)
      AND (${dt}::timestamptz IS NULL OR "createdAt" <= ${dt}::timestamptz)
  `

  return {
    logs: logs as unknown as AppLogEntry[],
    total: Number.parseInt(countResult[0]?.count || "0", 10),
  }
}

/**
 * Получить статистику ошибок за последние N дней
 */
export async function getLogStats(days = 7) {
  const result = await sql`
    SELECT
      level,
      source,
      DATE("createdAt") as date,
      COUNT(*) as count
    FROM "AppLog"
    WHERE "createdAt" >= NOW() - ${days + ' days'}::interval
    GROUP BY level, source, DATE("createdAt")
    ORDER BY date DESC, count DESC
  `
  return result
}

/**
 * Удалить старые логи (старше N дней)
 */
export async function cleanOldLogs(daysToKeep = 30): Promise<number> {
  const result = await sql`
    DELETE FROM "AppLog"
    WHERE "createdAt" < NOW() - ${daysToKeep + ' days'}::interval
    RETURNING id
  `
  return result.length
}
