-- Одноразовая чистка «осиротевших» extras-транзакций.
-- До фикса PATCH-обработчика при удалении/правке допродаж в уже завершённой
-- заявке транзакции с category='extras' оставались в БД. Этот скрипт удаляет
-- только те, у которых у соответствующей заявки extras сейчас пуст/NULL —
-- т.е. пользователь явно очистил допродажи, но записи в финансах остались.
-- Не трогает транзакции у заявок, где extras не пустой (там всё ещё нужна
-- точечная реконсиляция при следующем PATCH).

-- Сначала DRY-RUN — посмотреть что будет удалено, ничего не меняя.
-- Запустить в psql, убедиться что список ок, потом выполнить DELETE ниже.
SELECT
  t.id            AS tx_id,
  t.amount,
  t.description,
  t.date,
  gl."clientName",
  gl."gameDate",
  gl."extras"     AS lead_extras_now
FROM "Transaction" t
JOIN "GameLead" gl ON gl.id = t."gameLeadId"
WHERE t.category = 'extras'
  AND (gl."extras" IS NULL OR gl."extras" = '' OR gl."extras" = '[]' OR (gl."extrasAmount" IS NULL OR gl."extrasAmount" = 0))
ORDER BY t.date DESC;

-- Если список выше выглядит правильно (все эти транзакции реально надо снести) —
-- раскомментировать и выполнить:
--
-- DELETE FROM "Transaction"
-- WHERE category = 'extras'
--   AND "gameLeadId" IN (
--     SELECT id FROM "GameLead"
--     WHERE "extras" IS NULL OR "extras" = '' OR "extras" = '[]' OR "extrasAmount" IS NULL OR "extrasAmount" = 0
--   );
