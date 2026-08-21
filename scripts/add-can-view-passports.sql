-- Право «Паспорта искателей» для admin-роли.
-- Франчайзи включает/выключает через UI Доступ.
-- По умолчанию FALSE — админ не видит паспорта, пока франчайзи не разрешит.

ALTER TABLE "UserPermission"
  ADD COLUMN IF NOT EXISTS "canViewPassports" BOOLEAN NOT NULL DEFAULT FALSE;
