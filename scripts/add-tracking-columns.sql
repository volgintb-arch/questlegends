-- Ad tracking columns for offline conversion attribution
-- Adds yclid (Yandex Direct), gclid (Google Ads), utm_*, referrer to Deal and GameLead
-- Plus IncomingPayloadLog table for raw webhook payloads (30-day retention)

-- Deal
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "yclid" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "gclid" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "utmSource" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "utmMedium" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "utmContent" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "utmTerm" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "referrer" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "payloadLogId" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Deal_yclid_idx" ON "Deal" ("yclid");
CREATE INDEX IF NOT EXISTS "Deal_gclid_idx" ON "Deal" ("gclid");

-- GameLead
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "yclid" TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "gclid" TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "utmSource" TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "utmMedium" TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "utmContent" TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "utmTerm" TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "referrer" TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "payloadLogId" TEXT;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "GameLead_yclid_idx" ON "GameLead" ("yclid");
CREATE INDEX IF NOT EXISTS "GameLead_gclid_idx" ON "GameLead" ("gclid");

-- IncomingPayloadLog (raw webhook payloads, 30-day retention via cleanup job)
CREATE TABLE IF NOT EXISTS "IncomingPayloadLog" (
  id            TEXT PRIMARY KEY,
  channel       TEXT NOT NULL,
  "integrationId" TEXT,
  payload       JSONB NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IncomingPayloadLog_channel_idx" ON "IncomingPayloadLog" ("channel");
CREATE INDEX IF NOT EXISTS "IncomingPayloadLog_createdAt_idx" ON "IncomingPayloadLog" ("createdAt");
