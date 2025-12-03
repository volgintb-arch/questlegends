/**
 * Audit Middleware
 * Automatically logs all create/update/delete operations
 */

import { createAuditLog, type AuditLogInput } from "../services/audit.service"

export interface AuditableOperation {
  entityType: "deal" | "transaction" | "expense" | "personnel" | "role" | "permission" | "franchisee"
  entityId: string
  action: "create" | "update" | "delete"
  oldData?: any
  newData?: any
}

export interface RequestContext {
  userId: string
  userEmail: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Log operation to audit trail
 * Should be called after successful database operation
 */
export async function logAuditTrail(operation: AuditableOperation, context: RequestContext): Promise<void> {
  try {
    const auditInput: AuditLogInput = {
      userId: context.userId,
      userEmail: context.userEmail,
      entityType: operation.entityType,
      entityId: operation.entityId,
      action: operation.action,
      oldValues: operation.oldData,
      newValues: operation.newData,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    }

    await createAuditLog(auditInput)
  } catch (error) {
    // Don't throw - audit logging should not break main operations
    console.error("[Audit Middleware] Error logging audit trail:", error)
  }
}

/**
 * Wrap service method with automatic audit logging
 */
export function withAuditLog<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  getAuditInfo: (...args: Parameters<T>) => AuditableOperation,
): T {
  return (async (...args: Parameters<T>) => {
    // Execute original function
    const result = await fn(...args)

    // Log to audit trail (async, don't wait)
    const auditInfo = getAuditInfo(...args)

    // Get context from args or default
    const context: RequestContext = {
      userId: "system",
      userEmail: "system@questlegends.com",
    }

    logAuditTrail(auditInfo, context).catch((err) => {
      console.error("[Audit Middleware] Failed to log:", err)
    })

    return result
  }) as T
}
