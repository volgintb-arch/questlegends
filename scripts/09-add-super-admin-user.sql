-- Создание нулевого пользователя с правами УК (супер-админ)
-- Логин: +79000000000
-- Пароль: admin123

DO $$
DECLARE
  super_admin_id TEXT;
BEGIN
  -- Создаем супер-админа УК если его еще нет
  INSERT INTO "User" (
    id,
    name,
    phone,
    email,
    "passwordHash",
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
    '$2a$10$YQj5F3LZxGxJ9hGz5F3LZO8KqXjF3LZxGxJ9hGz5F3LZxGxJ9hGz5.',  -- bcrypt хэш для 'admin123'
    'uk',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (phone) DO NOTHING
  RETURNING id INTO super_admin_id;

  -- Если пользователь был создан, добавляем ему полные права
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
