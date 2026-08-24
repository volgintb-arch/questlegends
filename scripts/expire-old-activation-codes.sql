-- D-011: 6-месячный TTL на activationCode для завершённых игр.
-- Родитель может активировать паспорт после игры в течение полугода,
-- потом код освобождается для повторного использования.
--
-- Запускать по крону раз в сутки:
--   0 3 * * *  bash -lc 'cd /var/www/questlegends && \
--     export $(grep ^DATABASE_URL= .env | xargs) && \
--     psql "$DATABASE_URL" -f scripts/expire-old-activation-codes.sql \
--     >> /var/log/questlegends-cron.log 2>&1'

UPDATE "GameLead"
SET "activationCode" = NULL, "updatedAt" = NOW()
WHERE "activationCode" IS NOT NULL
  AND "completedAt" IS NOT NULL
  AND "completedAt" < NOW() - INTERVAL '6 months';
