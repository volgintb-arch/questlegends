-- Update default royalty percent from 10% to 7%

-- Update the default value in the Franchisee table
ALTER TABLE "Franchisee" ALTER COLUMN "royaltyPercent" SET DEFAULT 7;

-- Update all existing franchisees that have 10% to 7%
UPDATE "Franchisee" SET "royaltyPercent" = 7 WHERE "royaltyPercent" = 10;

-- Ensure NULL values are set to 7%
UPDATE "Franchisee" SET "royaltyPercent" = 7 WHERE "royaltyPercent" IS NULL;
