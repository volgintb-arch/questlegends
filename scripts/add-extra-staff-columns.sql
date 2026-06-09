-- Optional "extra staff" slot on GameLead — counted into planned staff cost the same way as animators/hosts/djs.
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "extraStaffCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameLead" ADD COLUMN IF NOT EXISTS "extraStaffRate"  INTEGER NOT NULL DEFAULT 0;
