-- Add FranchiseeKPI table for tracking franchise goals
CREATE TABLE IF NOT EXISTS "FranchiseeKPI" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "franchiseeId" TEXT NOT NULL REFERENCES "Franchisee"(id) ON DELETE CASCADE,
  "periodType" TEXT NOT NULL CHECK ("periodType" IN ('month', 'quarter', 'year')),
  "periodNumber" INTEGER NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "targetRevenue" INTEGER,
  "targetGames" INTEGER,
  "maxExpenses" INTEGER,
  "actualRevenue" INTEGER DEFAULT 0,
  "actualGames" INTEGER DEFAULT 0,
  "actualExpenses" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_franchisee_kpi_franchisee ON "FranchiseeKPI"("franchiseeId");
CREATE INDEX IF NOT EXISTS idx_franchisee_kpi_period ON "FranchiseeKPI"("periodYear", "periodType", "periodNumber");

-- Add Expense table (if not exists)
CREATE TABLE IF NOT EXISTS "Expense" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "franchiseeId" TEXT NOT NULL REFERENCES "Franchisee"(id) ON DELETE CASCADE,
  "createdById" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_franchisee ON "Expense"("franchiseeId");
CREATE INDEX IF NOT EXISTS idx_expense_date ON "Expense"(date);
CREATE INDEX IF NOT EXISTS idx_expense_category ON "Expense"(category);

-- Add GameAssignment table (if not exists)
CREATE TABLE IF NOT EXISTS "GameAssignment" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dealId" TEXT NOT NULL REFERENCES "Deal"(id) ON DELETE CASCADE,
  "personnelId" TEXT NOT NULL REFERENCES "Personnel"(id) ON DELETE CASCADE,
  "createdById" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "assignedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_assignment_deal ON "GameAssignment"("dealId");
CREATE INDEX IF NOT EXISTS idx_game_assignment_personnel ON "GameAssignment"("personnelId");

-- Add AdminPermission table (if not exists)
CREATE TABLE IF NOT EXISTS "AdminPermission" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT UNIQUE NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "canManagePersonnel" BOOLEAN DEFAULT true,
  "canManageDeals" BOOLEAN DEFAULT true,
  "canViewFinances" BOOLEAN DEFAULT true,
  "canManageSchedule" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add RefreshToken table (if not exists)
CREATE TABLE IF NOT EXISTS "RefreshToken" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS idx_refresh_token_token ON "RefreshToken"(token);

-- Add royaltyPercent column to Franchisee if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Franchisee' AND column_name = 'royaltyPercent'
  ) THEN
    ALTER TABLE "Franchisee" ADD COLUMN "royaltyPercent" INTEGER DEFAULT 10;
  END IF;
END $$;

-- Update existing franchisees with default royalty
UPDATE "Franchisee" SET "royaltyPercent" = 10 WHERE "royaltyPercent" IS NULL;
