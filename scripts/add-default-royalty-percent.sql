-- Add default 7% royalty to all franchisees
UPDATE "Franchisee" 
SET "royaltyPercent" = 7.0
WHERE "royaltyPercent" IS NULL;

-- Set default for new franchisees
ALTER TABLE "Franchisee" 
ALTER COLUMN "royaltyPercent" SET DEFAULT 7.0;
