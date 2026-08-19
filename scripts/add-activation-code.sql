-- D-011: 4-значный код активации квеста на GameLead.
-- Родитель на seeker-passport вводит этот код вместо даты/времени игры.
-- Генерирует questlegends при переходе лида в стадию "Согласовано"
-- (stageType='scheduled'), уникален глобально.
--
-- Unique index на nullable колонке в Postgres: NULL != NULL, поэтому
-- множественные NULL-значения не конфликтуют — что нам нужно
-- (у большинства лидов кода нет).

ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "activationCode" VARCHAR(4);
CREATE UNIQUE INDEX IF NOT EXISTS "GameLead_activationCode_key" ON "GameLead" ("activationCode");
