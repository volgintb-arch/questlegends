-- Create DealStage enum
DO $$ BEGIN
  CREATE TYPE "DealStage" AS ENUM ('NEW', 'NEGOTIATION', 'PREPAID', 'SCHEDULED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Priority enum
DO $$ BEGIN
  CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Deal table
CREATE TABLE IF NOT EXISTS "Deal" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "title" TEXT NOT NULL,
  "stage" "DealStage" NOT NULL DEFAULT 'NEW',
  "source" TEXT,
  "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
  
  "clientName" TEXT NOT NULL,
  "clientPhone" TEXT NOT NULL,
  "clientTelegram" TEXT,
  "clientWhatsapp" TEXT,
  "clientEmail" TEXT,
  
  "participants" INTEGER NOT NULL DEFAULT 0,
  "checkPerPerson" INTEGER NOT NULL DEFAULT 0,
  "gameDate" TIMESTAMP(3),
  
  "animatorsCount" INTEGER NOT NULL DEFAULT 0,
  "animatorRate" INTEGER NOT NULL DEFAULT 0,
  "hostRate" INTEGER NOT NULL DEFAULT 0,
  "djRate" INTEGER NOT NULL DEFAULT 0,
  
  "responsibleId" TEXT,
  "franchiseeId" TEXT NOT NULL,
  
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Deal_stage_idx" ON "Deal"("stage");
CREATE INDEX IF NOT EXISTS "Deal_franchiseeId_idx" ON "Deal"("franchiseeId");
CREATE INDEX IF NOT EXISTS "Deal_gameDate_idx" ON "Deal"("gameDate");
CREATE INDEX IF NOT EXISTS "Deal_responsibleId_idx" ON "Deal"("responsibleId");

-- Add foreign keys
DO $$ BEGIN
  ALTER TABLE "Deal" ADD CONSTRAINT "Deal_responsibleId_fkey" 
    FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Deal" ADD CONSTRAINT "Deal_franchiseeId_fkey" 
    FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Verify table created
SELECT 'Deal table created successfully' as status;
