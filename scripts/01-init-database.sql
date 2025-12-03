-- Create all tables for QuestLegends OS 2.0

-- Users and Authentication
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "telegram" TEXT,
    "whatsapp" TEXT,
    "telegramId" TEXT,
    "description" TEXT,
    "franchiseeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isUKEmployee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AdminPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "canCreateDeals" BOOLEAN NOT NULL DEFAULT true,
    "canEditDeals" BOOLEAN NOT NULL DEFAULT true,
    "canViewFinances" BOOLEAN NOT NULL DEFAULT false,
    "canManagePersonnel" BOOLEAN NOT NULL DEFAULT true,
    "canViewSchedule" BOOLEAN NOT NULL DEFAULT true,
    "canAssignPersonnel" BOOLEAN NOT NULL DEFAULT true,
    "canAddExpenses" BOOLEAN NOT NULL DEFAULT false
);

-- Franchisees
CREATE TABLE IF NOT EXISTS "Franchisee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "telegram" TEXT,
    "address" TEXT,
    "royaltyPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- B2C Deals (Games)
CREATE TABLE IF NOT EXISTS "Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientTelegram" TEXT,
    "source" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'new',
    "participants" INTEGER,
    "gameDate" TIMESTAMP(3),
    "package" TEXT,
    "price" DOUBLE PRECISION,
    "responsible" TEXT,
    "responsibleId" TEXT NOT NULL,
    "animator" TEXT,
    "host" TEXT,
    "dj" TEXT,
    "notes" TEXT,
    "franchiseeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- B2B Deals (Franchise Sales)
CREATE TABLE IF NOT EXISTS "B2BDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "companyName" TEXT,
    "city" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'lead',
    "franchiseFee" DOUBLE PRECISION,
    "paybackPeriod" INTEGER,
    "notes" TEXT,
    "responsibleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Tasks
CREATE TABLE IF NOT EXISTS "DealTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "B2BTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "b2bDealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Personnel and Assignments
CREATE TABLE IF NOT EXISTS "Personnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "telegram" TEXT,
    "whatsapp" TEXT,
    "hourlyRate" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PersonnelAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "hours" DOUBLE PRECISION,
    "salary" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Shifts
CREATE TABLE IF NOT EXISTS "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personnelId" TEXT NOT NULL,
    "franchiseeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "hoursWorked" DOUBLE PRECISION,
    "dealId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Expenses
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Transactions (ERP)
CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseeId" TEXT NOT NULL,
    "dealId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'revenue',
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- KPI
CREATE TABLE IF NOT EXISTS "FranchiseeKPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseeId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "targetRevenue" DOUBLE PRECISION,
    "targetGames" INTEGER,
    "maxExpenses" DOUBLE PRECISION,
    "actualRevenue" DOUBLE PRECISION DEFAULT 0,
    "actualGames" INTEGER DEFAULT 0,
    "actualExpenses" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Telegram Templates
CREATE TABLE IF NOT EXISTS "TelegramTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "User_franchiseeId_idx" ON "User"("franchiseeId");
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");
CREATE INDEX IF NOT EXISTS "Deal_franchiseeId_idx" ON "Deal"("franchiseeId");
CREATE INDEX IF NOT EXISTS "Deal_responsibleId_idx" ON "Deal"("responsibleId");
CREATE INDEX IF NOT EXISTS "Deal_stage_idx" ON "Deal"("stage");
CREATE INDEX IF NOT EXISTS "B2BDeal_responsibleId_idx" ON "B2BDeal"("responsibleId");
CREATE INDEX IF NOT EXISTS "Personnel_franchiseeId_idx" ON "Personnel"("franchiseeId");
CREATE INDEX IF NOT EXISTS "Expense_franchiseeId_idx" ON "Expense"("franchiseeId");
CREATE INDEX IF NOT EXISTS "Transaction_franchiseeId_idx" ON "Transaction"("franchiseeId");
CREATE INDEX IF NOT EXISTS "FranchiseeKPI_franchiseeId_idx" ON "FranchiseeKPI"("franchiseeId");

-- Add foreign key constraints
ALTER TABLE "User" ADD CONSTRAINT "User_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminPermission" ADD CONSTRAINT "AdminPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "B2BDeal" ADD CONSTRAINT "B2BDeal_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DealTask" ADD CONSTRAINT "DealTask_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BTask" ADD CONSTRAINT "B2BTask_b2bDealId_fkey" FOREIGN KEY ("b2bDealId") REFERENCES "B2BDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BTask" ADD CONSTRAINT "B2BTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Personnel" ADD CONSTRAINT "Personnel_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Personnel" ADD CONSTRAINT "Personnel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PersonnelAssignment" ADD CONSTRAINT "PersonnelAssignment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonnelAssignment" ADD CONSTRAINT "PersonnelAssignment_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FranchiseeKPI" ADD CONSTRAINT "FranchiseeKPI_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TelegramTemplate" ADD CONSTRAINT "TelegramTemplate_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
