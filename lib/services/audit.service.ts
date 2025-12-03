/**
 * Audit Log Service
 * Handles creation and querying of audit logs for all entity changes
 */

export interface AuditLogInput {
  userId: string
  userEmail: string
  entityType: "deal" | "transaction" | "expense" | "personnel" | "role" | "permission" | "franchisee"
  entityId: string
  action: "create" | "update" | "delete"
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export interface AuditLog {
  id: string
  userId: string
  userEmail: string
  user_name: string
  entityType: string
  entity: string
  entityId: string
  action: "create" | "update" | "delete"
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  field?: string
  old_value?: any
  new_value?: any
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  created_at: Date
}

/**
 * Create audit log entry
 * Automatically calculates field-level changes
 */
export async function createAuditLog(input: AuditLogInput): Promise<AuditLog> {
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: input.userId,
    userEmail: input.userEmail,
    user_name: input.userEmail.split("@")[0],
    entityType: input.entityType,
    entity: input.entityType,
    entityId: input.entityId,
    action: input.action,
    oldValues: input.oldValues,
    newValues: input.newValues,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    createdAt: new Date(),
    created_at: new Date(),
  }

  // Calculate changed fields for update actions
  if (input.action === "update" && input.oldValues && input.newValues) {
    const changedFields = getChangedFields(input.oldValues, input.newValues)
    if (changedFields.length > 0) {
      // For display purposes, store first changed field
      const firstChange = changedFields[0]
      log.field = firstChange.field
      log.old_value = firstChange.oldValue
      log.new_value = firstChange.newValue
    }
  }

  // In real backend: INSERT INTO audit_logs (...) VALUES (...) RETURNING *
  console.log("[Audit Service] Created audit log:", log.id, log.action, log.entityType)

  // Save to mock storage for demo
  saveAuditLog(log)

  return log
}

/**
 * Get changed fields between old and new values
 */
function getChangedFields(
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
): Array<{ field: string; oldValue: any; newValue: any }> {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = []

  // Check all fields in newValues
  for (const [key, newValue] of Object.entries(newValues)) {
    const oldValue = oldValues[key]

    // Skip if values are the same
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      continue
    }

    // Skip metadata fields
    if (["createdAt", "updatedAt", "updated_at", "created_at"].includes(key)) {
      continue
    }

    changes.push({
      field: key,
      oldValue,
      newValue,
    })
  }

  return changes
}

/**
 * Query audit logs with filters
 */
export interface AuditLogFilters {
  entityType?: string
  entityId?: string
  userId?: string
  action?: "create" | "update" | "delete"
  startDate?: Date
  endDate?: Date
}

export async function getAuditLogs(
  filters?: AuditLogFilters,
  page = 1,
  limit = 50,
): Promise<{ logs: AuditLog[]; total: number }> {
  // In real backend: SELECT * FROM audit_logs WHERE ... ORDER BY created_at DESC LIMIT $1 OFFSET $2

  let logs = getMockAuditLogs()

  // Apply filters
  if (filters) {
    if (filters.entityType) {
      logs = logs.filter((log) => log.entityType === filters.entityType)
    }
    if (filters.entityId) {
      logs = logs.filter((log) => log.entityId === filters.entityId)
    }
    if (filters.userId) {
      logs = logs.filter((log) => log.userId === filters.userId)
    }
    if (filters.action) {
      logs = logs.filter((log) => log.action === filters.action)
    }
    if (filters.startDate) {
      logs = logs.filter((log) => new Date(log.createdAt) >= filters.startDate!)
    }
    if (filters.endDate) {
      logs = logs.filter((log) => new Date(log.createdAt) <= filters.endDate!)
    }
  }

  // Sort by date descending
  logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const total = logs.length
  const start = (page - 1) * limit
  const paginatedLogs = logs.slice(start, start + limit)

  return {
    logs: paginatedLogs,
    total,
  }
}

/**
 * Get audit logs for specific entity
 */
export async function getEntityAuditLogs(entityType: string, entityId: string): Promise<AuditLog[]> {
  const result = await getAuditLogs({ entityType, entityId }, 1, 1000)
  return result.logs
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogs(filters?: AuditLogFilters): Promise<string> {
  const result = await getAuditLogs(filters, 1, 10000)

  // CSV header
  let csv = "ID,Date,User,Entity Type,Entity ID,Action,Field,Old Value,New Value,IP Address\n"

  // CSV rows
  for (const log of result.logs) {
    csv +=
      [
        log.id,
        log.createdAt.toISOString(),
        log.userEmail,
        log.entityType,
        log.entityId,
        log.action,
        log.field || "",
        log.old_value || "",
        log.new_value || "",
        log.ipAddress || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",") + "\n"
  }

  return csv
}

/**
 * Mock storage for audit logs (frontend demo)
 * In production, this would be handled by backend database
 */
function saveAuditLog(log: AuditLog): void {
  if (typeof window === "undefined") return

  const logs = getMockAuditLogs()
  logs.push(log)

  // Keep only last 1000 logs in memory
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000)
  }

  localStorage.setItem("mock_audit_logs", JSON.stringify(logs))
}

function getMockAuditLogs(): AuditLog[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem("mock_audit_logs")
  return stored ? JSON.parse(stored) : []
}
