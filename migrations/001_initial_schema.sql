-- QuestLegends OS 2.0 - Initial Database Schema
-- Migration 001: Create all tables with relationships and indexes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('uk', 'franchisee', 'admin', 'employee')),
  phone VARCHAR(50),
  telegram_id VARCHAR(100) UNIQUE,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_telegram ON users(telegram_id);
CREATE INDEX idx_users_active ON users(is_active);

-- Franchisees table
CREATE TABLE franchisees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  address TEXT,
  manager_name VARCHAR(255),
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_franchisees_owner ON franchisees(owner_user_id);
CREATE INDEX idx_franchisees_active ON franchisees(is_active);

-- User franchisee access (many-to-many)
CREATE TABLE user_franchisee_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  franchisee_id UUID REFERENCES franchisees(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, franchisee_id)
);

CREATE INDEX idx_ufa_user ON user_franchisee_access(user_id);
CREATE INDEX idx_ufa_franchisee ON user_franchisee_access(franchisee_id);

-- ============================================
-- CRM TABLES
-- ============================================

-- Deals table
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  stage VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) DEFAULT 0,
  source VARCHAR(100),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Game parameters
  participants INTEGER DEFAULT 0,
  package VARCHAR(100),
  game_date TIMESTAMP,
  
  -- Calculation fields
  check_per_person DECIMAL(10, 2) DEFAULT 0,
  animators_count INTEGER DEFAULT 0,
  animator_rate DECIMAL(10, 2) DEFAULT 0,
  host_rate DECIMAL(10, 2) DEFAULT 0,
  dj_rate DECIMAL(10, 2) DEFAULT 0,
  
  -- Relationships
  location_id UUID REFERENCES franchisees(id) ON DELETE CASCADE,
  responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Contact information
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  contact_company VARCHAR(255),
  contact_social_vk VARCHAR(255),
  contact_social_telegram VARCHAR(255),
  contact_social_instagram VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deals_location ON deals(location_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_responsible ON deals(responsible_user_id);
CREATE INDEX idx_deals_date ON deals(game_date);
CREATE INDEX idx_deals_priority ON deals(priority);
CREATE INDEX idx_deals_location_stage ON deals(location_id, stage);

-- Deal activities table
CREATE TABLE deal_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('event', 'comment', 'message', 'task')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deal_activities_deal ON deal_activities(deal_id);
CREATE INDEX idx_deal_activities_type ON deal_activities(type);
CREATE INDEX idx_deal_activities_status ON deal_activities(status);

-- ============================================
-- ERP TABLES
-- ============================================

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  amo_deal_id VARCHAR(100),
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  location_id UUID REFERENCES franchisees(id) ON DELETE CASCADE NOT NULL,
  
  -- Main parameters
  participants_count INTEGER NOT NULL,
  check_per_person DECIMAL(12, 2) NOT NULL,
  
  -- Calculation fields
  animators_count INTEGER NOT NULL,
  animator_rate DECIMAL(10, 2) NOT NULL,
  host_rate DECIMAL(10, 2) NOT NULL,
  dj_rate DECIMAL(10, 2) NOT NULL,
  
  -- Calculated totals
  total_revenue DECIMAL(12, 2) NOT NULL,
  royalty_amount DECIMAL(12, 2) NOT NULL,
  fot_calculation DECIMAL(12, 2) NOT NULL,
  
  -- Historical rates snapshot
  historical_rates JSONB,
  
  -- Idempotency
  idempotency_key VARCHAR(255) UNIQUE,
  
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_location ON transactions(location_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_deal ON transactions(deal_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_location_date ON transactions(location_id, date);
CREATE INDEX idx_transactions_date_status ON transactions(date, status);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES franchisees(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expenses_location ON expenses(location_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_location_date ON expenses(location_id, date);
CREATE INDEX idx_expenses_date_category ON expenses(date, category);

-- ============================================
-- PERSONNEL TABLES
-- ============================================

-- Personnel table
CREATE TABLE personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES franchisees(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  telegram_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive')),
  join_date DATE,
  notes TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_personnel_location ON personnel(location_id);
CREATE INDEX idx_personnel_status ON personnel(status);
CREATE INDEX idx_personnel_telegram ON personnel(telegram_id);
CREATE INDEX idx_personnel_user ON personnel(user_id);
CREATE INDEX idx_personnel_location_status ON personnel(location_id, status);

-- Game assignments table
CREATE TABLE game_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(100) NOT NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(deal_id, personnel_id, role)
);

CREATE INDEX idx_game_assignments_deal ON game_assignments(deal_id);
CREATE INDEX idx_game_assignments_personnel ON game_assignments(personnel_id);
CREATE INDEX idx_game_assignments_assigned_by ON game_assignments(assigned_by);

-- Payroll table
CREATE TABLE payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES franchisees(id) ON DELETE CASCADE NOT NULL,
  personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
  period VARCHAR(20) NOT NULL,
  base_salary DECIMAL(12, 2) NOT NULL,
  bonus DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  games_count INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(personnel_id, period)
);

CREATE INDEX idx_payroll_location ON payroll(location_id);
CREATE INDEX idx_payroll_personnel ON payroll(personnel_id);
CREATE INDEX idx_payroll_period ON payroll(period);

-- ============================================
-- SYSTEM TABLES
-- ============================================

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

-- Knowledge base table
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kb_category ON knowledge_base(category);
CREATE INDEX idx_kb_published ON knowledge_base(is_published);
CREATE INDEX idx_kb_author ON knowledge_base(author_id);

-- KB files table
CREATE TABLE kb_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES knowledge_base(id) ON DELETE CASCADE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kb_files_article ON kb_files(article_id);

-- Custom roles table
CREATE TABLE custom_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES franchisees(id) ON DELETE CASCADE NOT NULL,
  role_name VARCHAR(255) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_custom_roles_location ON custom_roles(location_id);
CREATE INDEX idx_custom_roles_created_by ON custom_roles(created_by);

-- User permissions table
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  location_id UUID REFERENCES franchisees(id) ON DELETE CASCADE,
  custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL,
  permissions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_location ON user_permissions(location_id);
CREATE INDEX idx_user_permissions_active ON user_permissions(is_active);

-- Webhook logs table
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  endpoint_url TEXT,
  status_code INTEGER,
  response TEXT,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_event ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status_code);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_franchisees_updated_at BEFORE UPDATE ON franchisees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personnel_updated_at BEFORE UPDATE ON personnel
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON payroll
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_roles_updated_at BEFORE UPDATE ON custom_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON user_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
