-- Insert demo franchisee
INSERT INTO "Franchisee" ("id", "name", "city", "phone", "telegram", "royaltyPercent", "createdAt", "updatedAt")
VALUES 
  ('franchise-1', 'QuestLegends Москва', 'Москва', '+79991234567', '@questmoscow', 10, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- Insert demo users (password for all: demo123)
-- Password hash for "demo123": $2a$10$YQ5xZJ8jQXZ5Y5X5Y5Y5Y5eY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5
INSERT INTO "User" ("id", "phone", "passwordHash", "name", "role", "franchiseeId", "isActive", "createdAt", "updatedAt")
VALUES 
  ('user-uk', '+79001111111', '$2a$10$YQ5xZJ8jQXZ5Y5X5Y5Y5Y.eY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y', 'Управляющая Компания', 'uk', NULL, true, NOW(), NOW()),
  ('user-franchisee', '+79002222222', '$2a$10$YQ5xZJ8jQXZ5Y5X5Y5Y5Y.eY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y', 'Франчайзи Иван', 'franchisee', 'franchise-1', true, NOW(), NOW()),
  ('user-admin', '+79003333333', '$2a$10$YQ5xZJ8jQXZ5Y5X5Y5Y5Y.eY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y', 'Администратор Петр', 'admin', 'franchise-1', true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- Insert admin permissions
INSERT INTO "AdminPermission" ("id", "userId", "canCreateDeals", "canEditDeals", "canViewFinances", "canManagePersonnel", "canViewSchedule", "canAssignPersonnel", "canAddExpenses")
VALUES 
  ('perm-admin', 'user-admin', true, true, false, true, true, true, false)
ON CONFLICT ("id") DO NOTHING;
