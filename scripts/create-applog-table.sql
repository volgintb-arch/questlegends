-- Создание таблицы AppLog для логирования ошибок приложения
-- Выполнить на продакшн БД

CREATE TABLE IF NOT EXISTS "AppLog" (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'info',
  source TEXT NOT NULL DEFAULT 'system',
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  method TEXT,
  "statusCode" INTEGER,
  "userId" TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applog_created ON "AppLog" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_applog_level ON "AppLog" (level);
CREATE INDEX IF NOT EXISTS idx_applog_source ON "AppLog" (source);
