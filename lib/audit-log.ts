/**
 * Система Audit Log для отслеживания критических действий
 * Доступ только для SUPER_ADMIN (read-only)
 */

import { sql } from "@/lib/db"

export type AuditAction =
  | "user_login"
  | "user_logout"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "role_changed"
  | "lead_created"
  | "lead_updated"
  | "lead_deleted"
  | "lead_stage_changed"
  | "integration_message"
  | "integration_lead_created"
  | "franchisee_created"
  | "franchisee_updated"
  | "permission_changed"
  | "system_setting_changed"

export type AuditEntityType = "user" | "lead" | "deal" | "franchisee" | "integration" | "permission" | "system"

export interface AuditLogEntry {
  id: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string | null
  userId: string
  userName: string
  userRole: string
  franchiseeId: string | null
  details: Record<string, any>
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export interface CreateAuditLogParams {
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string | null
  userId: string
  userName: string
  userRole: string
  franchiseeId?: string | null
  details?: Record<string, any>
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Записывает событие в audit log
 */
export async function logAuditEvent(params: CreateAuditLogParams): Promise<void> {
  try {
    const id = crypto.randomUUID()

    await sql`
      INSERT INTO "AuditLog" (
        id, action, "entityType", "entityId", "userId", "userName", "userRole",
        "franchiseeId", details, "ipAddress", "userAgent", "createdAt"
      )
      VALUES (
        ${id},
        ${params.action},
        ${params.entityType},
        ${params.entityId || null},
        ${params.userId},
        ${params.userName},
        ${params.userRole},
        ${params.franchiseeId || null},
        ${JSON.stringify(params.details || {})},
        ${params.ipAddress || null},
        ${params.userAgent || null},
        NOW()
      )
    `
  } catch (error) {
    // Не падаем если audit log не записался, но логируем ошибку
    console.error("[AuditLog] Failed to write audit log:", error)
  }
}

/**
 * Получает записи audit log (только для super_admin)
 */
export async function getAuditLogs(params: {
  page?: number
  limit?: number
  action?: AuditAction
  entityType?: AuditEntityType
  userId?: string
  franchiseeId?: string
  dateFrom?: Date
  dateTo?: Date
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const { page = 1, limit = 50, action, entityType, userId, franchiseeId, dateFrom, dateTo } = params

  const offset = (page - 1) * limit
  const conditions: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (action) {
    conditions.push(`action = $${paramIndex}`)
    values.push(action)
    paramIndex++
  }

  if (entityType) {
    conditions.push(`"entityType" = $${paramIndex}`)
    values.push(entityType)
    paramIndex++
  }

  if (userId) {
    conditions.push(`"userId" = $${paramIndex}`)
    values.push(userId)
    paramIndex++
  }

  if (franchiseeId) {
    conditions.push(`"franchiseeId" = $${paramIndex}`)
    values.push(franchiseeId)
    paramIndex++
  }

  if (dateFrom) {
    conditions.push(`"createdAt" >= $${paramIndex}`)
    values.push(dateFrom)
    paramIndex++
  }

  if (dateTo) {
    conditions.push(`"createdAt" <= $${paramIndex}`)
    values.push(dateTo)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  // Используем sql template для запроса с динамическими условиями
  const logsResult = await sql.query(
    `
    SELECT * FROM "AuditLog"
    ${whereClause}
    ORDER BY "createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `,
    values,
  )

  const countResult = await sql.query(
    `
    SELECT COUNT(*) as count FROM "AuditLog" ${whereClause}
  `,
    values,
  )

  return {
    logs: logsResult.rows as AuditLogEntry[],
    total: Number.parseInt(countResult.rows[0]?.count || "0", 10),
  }
}

/**
 * Хелпер для логирования входа пользователя
 */
export async function logUserLogin(
  userId: string,
  userName: string,
  userRole: string,
  franchiseeId: string | null,
  ipAddress?: string,
): Promise<void> {
  await logAuditEvent({
    action: "user_login",
    entityType: "user",
    entityId: userId,
    userId,
    userName,
    userRole,
    franchiseeId,
    ipAddress,
    details: { timestamp: new Date().toISOString() },
  })
}

/**
 * Хелпер для логирования смены роли
 */
export async function logRoleChange(
  targetUserId: string,
  targetUserName: string,
  oldRole: string,
  newRole: string,
  changedByUserId: string,
  changedByUserName: string,
  changedByUserRole: string,
): Promise<void> {
  await logAuditEvent({
    action: "role_changed",
    entityType: "user",
    entityId: targetUserId,
    userId: changedByUserId,
    userName: changedByUserName,
    userRole: changedByUserRole,
    details: {
      targetUserName,
      oldRole,
      newRole,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Хелпер для логирования создания лида через интеграцию
 */
export async function logIntegrationLeadCreated(
  leadId: string,
  source: string,
  franchiseeId: string | null,
  details: Record<string, any>,
): Promise<void> {
  await logAuditEvent({
    action: "integration_lead_created",
    entityType: "lead",
    entityId: leadId,
    userId: "system",
    userName: "Integration System",
    userRole: "system",
    franchiseeId,
    details: {
      source,
      ...details,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Хелпер для логирования изменения лида
 */
export async function logLeadChange(
  leadId: string,
  action: "lead_created" | "lead_updated" | "lead_deleted" | "lead_stage_changed",
  userId: string,
  userName: string,
  userRole: string,
  franchiseeId: string | null,
  details: Record<string, any>,
): Promise<void> {
  await logAuditEvent({
    action,
    entityType: "lead",
    entityId: leadId,
    userId,
    userName,
    userRole,
    franchiseeId,
    details: {
      ...details,
      timestamp: new Date().toISOString(),
    },
  })
}
