-- Создание нулевого пользователя с правами УК (супер-админ)
-- Логин: +79000000000
-- Пароль: admin123

DO $$
DECLARE
  super_admin_id TEXT;
BEGIN
  -- Обновляем или создаем супер-админа УК с правильным именем колонки passwordHash
  INSERT INTO "User" (
    id,
    name,
    phone,
    email,
    "passwordHash",  -- Изменено на passwordHash (NOT NULL колонка)
    role,
    "isActive",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    'super-admin-uk',
    'Супер Администратор УК',
    '+79000000000',
    'superadmin@questlegends.ru',
    '$2b$10$K7l3Z.Y9kN8M5N8M5N8M5.eGqJxP3Qv.YxP3Qv.YxP3Qv.YxP3Qv.Y',  -- bcrypt хэш для 'admin123'
    'uk',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (phone) DO UPDATE SET
    "passwordHash" = EXCLUDED."passwordHash",  -- Изменено на passwordHash
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    "isActive" = EXCLUDED."isActive",
    "updatedAt" = NOW()
  RETURNING id INTO super_admin_id;

  -- Если пользователь был создан или обновлен, добавляем ему полные права
  IF super_admin_id IS NOT NULL THEN
    INSERT INTO "UserPermission" (
      id,
      "userId",
      "canViewDashboard",
      "canViewDeals",
      "canEditDeals",
      "canViewFinances",
      "canAddExpenses",
      "canManagePersonnel",
      "canManageSchedule",
      "canViewKnowledgeBase",
      "canManageUsers",
      "canViewNotifications",
      "canManageConstants",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      'perm-super-admin',
      super_admin_id,
      true,  -- canViewDashboard
      true,  -- canViewDeals
      true,  -- canEditDeals
      true,  -- canViewFinances
      true,  -- canAddExpenses
      true,  -- canManagePersonnel
      true,  -- canManageSchedule
      true,  -- canViewKnowledgeBase
      true,  -- canManageUsers
      true,  -- canViewNotifications
      true,  -- canManageConstants
      NOW(),
      NOW()
    )
    ON CONFLICT ("userId") DO NOTHING;
  END IF;

  RAISE NOTICE 'Супер-администратор УК создан: +79000000000 / admin123';
END $$;
