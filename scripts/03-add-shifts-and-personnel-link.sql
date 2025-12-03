-- Add userId to Personnel to link with User
ALTER TABLE "Personnel" ADD COLUMN IF NOT EXISTS "userId" TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS "Personnel_userId_idx" ON "Personnel"("userId");

-- Create ShiftStatus enum type
DO $$ BEGIN
    CREATE TYPE "ShiftStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PersonnelRole enum type
DO $$ BEGIN
    CREATE TYPE "PersonnelRole" AS ENUM ('manager', 'staff', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Shift table for employee schedules
CREATE TABLE IF NOT EXISTS "Shift" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "personnelId" TEXT NOT NULL,
  "franchiseeId" TEXT NOT NULL,
  "dealId" TEXT,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  -- Changed role from TEXT to PersonnelRole enum
  "role" "PersonnelRole" NOT NULL,
  -- Changed status from TEXT to ShiftStatus enum
  "status" "ShiftStatus" NOT NULL DEFAULT 'scheduled',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "Shift_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Shift_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Shift_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Add status column to existing Shift table
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

COMMENT ON COLUMN "Shift".status IS 'Shift status: scheduled, in_progress, completed, cancelled';

CREATE INDEX IF NOT EXISTS "Shift_personnelId_idx" ON "Shift"("personnelId");
CREATE INDEX IF NOT EXISTS "Shift_franchiseeId_idx" ON "Shift"("franchiseeId");
CREATE INDEX IF NOT EXISTS "Shift_dealId_idx" ON "Shift"("dealId");
CREATE INDEX IF NOT EXISTS "Shift_startTime_idx" ON "Shift"("startTime");
CREATE INDEX IF NOT EXISTS "Shift_status_idx" ON "Shift"("status");
