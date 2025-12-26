-- Создание таблицы Audit Log для отслеживания критических действий
-- Доступ только для SUPER_ADMIN (read-only)

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userRole" TEXT NOT NULL,
  "franchiseeId" TEXT,
  details JSONB DEFAULT '{}',
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON "AuditLog" (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON "AuditLog" ("entityType");
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON "AuditLog" ("userId");
CREATE INDEX IF NOT EXISTS idx_audit_log_franchisee_id ON "AuditLog" ("franchiseeId");
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON "AuditLog" ("createdAt" DESC);

-- Составной индекс для фильтрации по нескольким полям
CREATE INDEX IF NOT EXISTS idx_audit_log_composite ON "AuditLog" (action, "entityType", "createdAt" DESC);

-- Комментарий к таблице
COMMENT ON TABLE "AuditLog" IS 'Журнал аудита критических действий системы. Доступ только для SUPER_ADMIN.';
