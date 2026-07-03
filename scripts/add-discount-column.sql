-- Скидка суммой на заявку; вычитается из totalAmount при recalc в PATCH.
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "discount" INTEGER NOT NULL DEFAULT 0;
