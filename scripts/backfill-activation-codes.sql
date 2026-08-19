-- Одноразовый backfill: генерирует activationCode для всех GameLead в
-- стадиях scheduled/completed, у которых кода ещё нет.
-- После прогона запустить scripts/resync-seeker-games.ts чтобы seeker
-- подтянул новые коды.
--
-- Алфавит A-Z0-9 (36 символов), 4 знака = 1.6M комбинаций.
-- Uniqueness через inner LOOP с 20 попытками на лид.

DO $$
DECLARE
  lead_row  RECORD;
  new_code  TEXT;
  attempts  INT;
  ok        BOOLEAN;
  filled    INT := 0;
BEGIN
  FOR lead_row IN
    SELECT gl.id
    FROM "GameLead" gl
    JOIN "GamePipelineStage" s ON s.id = gl."stageId"
    WHERE gl."activationCode" IS NULL
      AND s."stageType" IN ('scheduled', 'completed')
  LOOP
    attempts := 0;
    ok := FALSE;
    WHILE attempts < 20 AND NOT ok LOOP
      attempts := attempts + 1;
      new_code := '';
      FOR i IN 1..4 LOOP
        new_code := new_code || substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                                          FROM floor(random() * 36 + 1)::int FOR 1);
      END LOOP;
      IF NOT EXISTS (SELECT 1 FROM "GameLead" WHERE "activationCode" = new_code) THEN
        UPDATE "GameLead"
          SET "activationCode" = new_code, "updatedAt" = NOW()
          WHERE id = lead_row.id;
        ok := TRUE;
        filled := filled + 1;
      END IF;
    END LOOP;
    IF NOT ok THEN
      RAISE WARNING 'Не удалось выделить код для GameLead %', lead_row.id;
    END IF;
  END LOOP;
  RAISE NOTICE 'Backfill завершён: выдано % кодов', filled;
END $$;
