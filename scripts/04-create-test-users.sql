-- Очистка всех таблиц
DELETE FROM "Shift" WHERE true;
DELETE FROM "Deal" WHERE true;
DELETE FROM "Transaction" WHERE true;
DELETE FROM "Expense" WHERE true;
DELETE FROM "Personnel" WHERE true;
DELETE FROM "User" WHERE true;
DELETE FROM "Franchisee" WHERE true;

-- Создание франшиз
INSERT INTO "Franchisee" (id, name, city, address, created_at, updated_at) VALUES
('fr-uk-001', 'Управляющая Компания', 'Москва', 'ул. Тверская 1', NOW(), NOW()),
('fr-msk-001', 'Франшиза Москва', 'Москва', 'ул. Арбат 10', NOW(), NOW()),
('fr-spb-001', 'Франшиза Санкт-Петербург', 'Санкт-Петербург', 'Невский проспект 50', NOW(), NOW());

-- Создание пользователей с паролем "demo123" (bcrypt hash)
-- Пароль: demo123
-- Hash: $2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa

-- 1. УК (Управляющая Компания)
INSERT INTO "User" (id, name, phone, "passwordHash", role, "franchiseeId", "isActive", created_at, updated_at) VALUES
('user-uk-001', 'Директор УК', '+79001111111', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'uk', 'fr-uk-001', true, NOW(), NOW());

-- 2. Сотрудник УК
INSERT INTO "User" (id, name, phone, "passwordHash", role, "franchiseeId", "isActive", created_at, updated_at) VALUES
('user-uk-employee-001', 'Менеджер УК', '+79002222222', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'uk_employee', 'fr-uk-001', true, NOW(), NOW());

-- 3. Франчайзи
INSERT INTO "User" (id, name, phone, "passwordHash", role, "franchiseeId", "isActive", created_at, updated_at) VALUES
('user-franchisee-001', 'Франчайзи Москва', '+79003333333', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'franchisee', 'fr-msk-001', true, NOW(), NOW());

-- 4. Администратор локации
INSERT INTO "User" (id, name, phone, "passwordHash", role, "franchiseeId", "isActive", created_at, updated_at) VALUES
('user-admin-001', 'Администратор', '+79004444444', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'admin', 'fr-msk-001', true, NOW(), NOW());

-- Создание персонала
INSERT INTO "Personnel" (id, "franchiseeId", name, role, phone, "isActive", created_at) VALUES
('pers-animator-001', 'fr-msk-001', 'Аниматор Иван', 'animator', '+79005555555', true, NOW()),
('pers-host-001', 'fr-msk-001', 'Ведущий Анна', 'host', '+79006666666', true, NOW()),
('pers-dj-001', 'fr-msk-001', 'Диджей Максим', 'dj', '+79007777777', true, NOW());

-- 5-7. Сотрудники (связь с персоналом)
INSERT INTO "User" (id, name, phone, "passwordHash", role, "franchiseeId", "isActive", created_at, updated_at) VALUES
('user-animator-001', 'Аниматор Иван', '+79005555555', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'employee', 'fr-msk-001', true, NOW(), NOW()),
('user-host-001', 'Ведущий Анна', '+79006666666', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'employee', 'fr-msk-001', true, NOW(), NOW()),
('user-dj-001', 'Диджей Максим', '+79007777777', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'employee', 'fr-msk-001', true, NOW(), NOW());

-- Связываем пользователей с персоналом
UPDATE "Personnel" SET "userId" = 'user-animator-001' WHERE id = 'pers-animator-001';
UPDATE "Personnel" SET "userId" = 'user-host-001' WHERE id = 'pers-host-001';
UPDATE "Personnel" SET "userId" = 'user-dj-001' WHERE id = 'pers-dj-001';
