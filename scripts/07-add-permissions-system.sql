-- Create UserPermission table for managing access rights
CREATE TABLE IF NOT EXISTS "UserPermission" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  
  -- Module access permissions
  "canViewDashboard" BOOLEAN DEFAULT true,
  "canViewDeals" BOOLEAN DEFAULT false,
  "canEditDeals" BOOLEAN DEFAULT false,
  "canViewFinances" BOOLEAN DEFAULT false,
  "canAddExpenses" BOOLEAN DEFAULT false,
  "canManagePersonnel" BOOLEAN DEFAULT false,
  "canManageSchedule" BOOLEAN DEFAULT false,
  "canViewKnowledgeBase" BOOLEAN DEFAULT true,
  "canManageUsers" BOOLEAN DEFAULT false,
  "canViewNotifications" BOOLEAN DEFAULT true,
  "canManageConstants" BOOLEAN DEFAULT false,
  
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE("userId")
);

CREATE INDEX IF NOT EXISTS "idx_userpermission_userid" ON "UserPermission"("userId");
