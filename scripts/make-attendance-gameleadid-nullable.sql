-- Разрешаем ClientAttendance.gameLeadId быть NULL для GUEST_UNCONFIRMED
-- активаций (challenge провален / родитель не опознал игру).
-- Дедуп продолжает работать через activationId (unique), а
-- (clientId, gameLeadId) unique в Postgres по умолчанию не запрещает
-- повторные NULL — так что клиент может иметь несколько unconfirmed
-- активаций подряд, что и требуется контрактом seeker'а.

ALTER TABLE "ClientAttendance" ALTER COLUMN "gameLeadId" DROP NOT NULL;
