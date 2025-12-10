-- Add gameDuration column to GameLead table
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "gameDuration" INTEGER DEFAULT 3;

-- Update existing records to have default 3 hour duration
UPDATE "GameLead" SET "gameDuration" = 3 WHERE "gameDuration" IS NULL;

-- Add comment
COMMENT ON COLUMN "GameLead"."gameDuration" IS 'Duration of game in hours (default 3)';
