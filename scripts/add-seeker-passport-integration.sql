-- PR1 инфры интеграции с seeker-passport (passport.questlegends.ru).
-- Добавляет:
--   * GameLead: seeker-специфичные поля (groupType, birthdayChildName, ...) + refCode
--   * Franchisee: citySlug (уникальный, для мэппинга seeker's `barnaul`/`omsk` → франчайзи)
--   * Client + ClientAttendance таблицы (гости с паспортом искателя и их посещения)
--   * enum'ы GroupType и AttendanceRole
-- Идемпотентен: можно прогонять повторно.

-- ============================================================
-- Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "GroupType" AS ENUM ('BIRTHDAY', 'CLASS', 'OPEN', 'CORPORATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AttendanceRole" AS ENUM ('GUEST', 'HOST_PARENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- GameLead: новые поля
-- ============================================================

ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "groupType"          "GroupType";
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "birthdayChildName"  TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "schoolName"         TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "schoolClass"        TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "venueName"          TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "hostName"           TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "adminName"          TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "reelUrl"            TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "reelReadyAt"        TIMESTAMP(3);
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "refCode"            VARCHAR(16);

CREATE INDEX IF NOT EXISTS "GameLead_refCode_idx" ON "GameLead" ("refCode");

-- ============================================================
-- Franchisee: citySlug для маппинга с seeker
-- ============================================================

ALTER TABLE "Franchisee" ADD COLUMN IF NOT EXISTS "citySlug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Franchisee_citySlug_key" ON "Franchisee" ("citySlug");

-- Сид для двух городов первой волны seeker'а.
-- Матчим кириллицу и латиницу, чтобы поймать оба возможных написания в БД.
UPDATE "Franchisee"
   SET "citySlug" = 'barnaul'
 WHERE "citySlug" IS NULL
   AND LOWER(TRIM("city")) IN ('барнаул', 'barnaul');

UPDATE "Franchisee"
   SET "citySlug" = 'omsk'
 WHERE "citySlug" IS NULL
   AND LOWER(TRIM("city")) IN ('омск', 'omsk');

-- ============================================================
-- Client (гости из паспорта искателя)
-- ============================================================

CREATE TABLE IF NOT EXISTS "Client" (
  "id"             TEXT        PRIMARY KEY,
  "phone"          TEXT        NOT NULL,
  "email"          TEXT,
  "childName"      TEXT        NOT NULL,
  "childNameNorm"  TEXT        NOT NULL,
  "childBirthdate" TIMESTAMP(3) NOT NULL,
  "tgUserId"       TEXT,
  "passportNumber" TEXT,
  "passportId"     TEXT,
  "refCode"        TEXT,
  "consentAt"      TIMESTAMP(3),
  "mediaConsentAt" TIMESTAMP(3),
  "source"         TEXT        NOT NULL DEFAULT 'seeker_passport',
  "callTaskAt"     TIMESTAMP(3),
  "franchiseeId"   TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Client_franchiseeId_fkey"
    FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee" ("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "Client_phone_key"       ON "Client" ("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_tgUserId_key"    ON "Client" ("tgUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_passportId_key"  ON "Client" ("passportId");
CREATE INDEX        IF NOT EXISTS "Client_childBirthdate_idx" ON "Client" ("childBirthdate");
CREATE INDEX        IF NOT EXISTS "Client_callTaskAt_idx"     ON "Client" ("callTaskAt");
CREATE INDEX        IF NOT EXISTS "Client_franchiseeId_idx"   ON "Client" ("franchiseeId");

-- ============================================================
-- ClientAttendance (визиты гостей на конкретные игры)
-- ============================================================

CREATE TABLE IF NOT EXISTS "ClientAttendance" (
  "id"            TEXT        PRIMARY KEY,
  "clientId"      TEXT        NOT NULL,
  "gameLeadId"    TEXT        NOT NULL,
  "role"          "AttendanceRole" NOT NULL DEFAULT 'GUEST',
  "confirmed"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "activationId"  TEXT        NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientAttendance_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE,
  CONSTRAINT "ClientAttendance_gameLeadId_fkey"
    FOREIGN KEY ("gameLeadId") REFERENCES "GameLead" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientAttendance_activationId_key"
  ON "ClientAttendance" ("activationId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientAttendance_clientId_gameLeadId_key"
  ON "ClientAttendance" ("clientId", "gameLeadId");
CREATE INDEX        IF NOT EXISTS "ClientAttendance_gameLeadId_idx"
  ON "ClientAttendance" ("gameLeadId");
