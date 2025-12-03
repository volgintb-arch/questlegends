-- QuestLegends OS 2.0 - Seed Data
-- Migration 002: Initial test data for development and testing

-- Clear existing data (development only!)
TRUNCATE TABLE 
  audit_logs, webhook_logs, refresh_tokens, user_permissions, custom_roles,
  kb_files, knowledge_base, notifications, payroll, game_assignments,
  personnel, expenses, transactions, deal_activities, deals,
  user_franchisee_access, franchisees, users
CASCADE;

-- ============================================
-- USERS
-- ============================================

-- UK (Management Company) user
INSERT INTO users (id, email, password_hash, name, role, phone, telegram_id, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'uk@questlegends.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP.r7QrD4I2', 'Управляющая Компания', 'uk', '+79991234567', 'uk_admin', true);

-- Franchisee owners
INSERT INTO users (id, email, password_hash, name, role, phone, telegram_id, is_active) VALUES
('22222222-2222-2222-2222-222222222222', 'franchisee1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP.r7QrD4I2', 'Иван Франчайзи', 'franchisee', '+79991234501', 'franchisee1_tg', true),
('33333333-3333-3333-3333-333333333333', 'franchisee2@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP.r7QrD4I2', 'Петр Владелец', 'franchisee', '+79991234502', 'franchisee2_tg', true),
('44444444-4444-4444-4444-444444444444', 'franchisee3@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP.r7QrD4I2', 'Мария Партнер', 'franchisee', '+79991234503', 'franchisee3_tg', true);

-- Location admins
INSERT INTO users (id, email, password_hash, name, role, phone, is_active) VALUES
('55555555-5555-5555-5555-555555555555', 'admin1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP.r7QrD4I2', 'Анна Администратор', 'admin', '+79991234511', true),
('66666666-6666-6666-6666-666666666666', 'admin2@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP.r7QrD4I2', 'Дмитрий Менеджер', 'admin', '+79991234512', true);

-- Employees
INSERT INTO users (id, email, password_hash, name, role, phone, telegram_id, is_active) VALUES
('77777777-7777-7777-7777-777777777777', 'employee1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP.r7QrD4I2', 'Сергей Сотрудник', 'employee', '+79991234521', 'employee1_tg', true),
('88888888-8888-8888-8888-888888888888', 'employee2@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP.r7QrD4I2', 'Елена Работник', 'employee', '+79991234522', 'employee2_tg', true);

-- ============================================
-- FRANCHISEES
-- ============================================

INSERT INTO franchisees (id, name, location, address, manager_name, owner_user_id, is_active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'QuestLegends Москва Центр', 'Москва', 'ул. Тверская, д. 1', 'Иван Франчайзи', '22222222-2222-2222-2222-222222222222', true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'QuestLegends СПб Невский', 'Санкт-Петербург', 'Невский пр., д. 50', 'Петр Владелец', '33333333-3333-3333-3333-333333333333', true),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'QuestLegends Казань Баумана', 'Казань', 'ул. Баумана, д. 20', 'Мария Партнер', '44444444-4444-4444-4444-444444444444', true);

-- ============================================
-- USER ACCESS
-- ============================================

-- Franchisees access to their locations
INSERT INTO user_franchisee_access (user_id, franchisee_id) VALUES
('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
('44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc');

-- Admins access
INSERT INTO user_franchisee_access (user_id, franchisee_id) VALUES
('55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('66666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Employees access
INSERT INTO user_franchisee_access (user_id, franchisee_id) VALUES
('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('88888888-8888-8888-8888-888888888888', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- ============================================
-- PERSONNEL
-- ============================================

INSERT INTO personnel (id, location_id, name, role, phone, email, telegram_id, status, join_date) VALUES
-- Moscow
('p1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Алексей Аниматоров', 'Аниматор', '+79991111111', 'animator1@example.com', 'animator1_tg', 'active', '2024-01-15'),
('p2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ольга Весёлая', 'Аниматор', '+79991111112', 'animator2@example.com', 'animator2_tg', 'active', '2024-01-20'),
('p3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Михаил Ведущий', 'Ведущий', '+79991111113', 'host1@example.com', 'host1_tg', 'active', '2024-02-01'),
('p4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Павел DJ', 'DJ', '+79991111114', 'dj1@example.com', 'dj1_tg', 'active', '2024-02-05'),
-- SPb
('p5555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Светлана Смешная', 'Аниматор', '+79992222111', 'animator3@example.com', 'animator3_tg', 'active', '2024-01-10'),
('p6666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Игорь Музыкант', 'DJ', '+79992222112', 'dj2@example.com', 'dj2_tg', 'active', '2024-01-15'),
-- Kazan
('p7777777-7777-7777-7777-777777777777', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Наталья Энергичная', 'Аниматор', '+79993333111', 'animator4@example.com', 'animator4_tg', 'active', '2024-02-01');

-- Note: Password for all test users is "password123" hashed with bcrypt
-- Default credentials:
-- uk@questlegends.com / password123
-- franchisee1@example.com / password123
-- etc.
