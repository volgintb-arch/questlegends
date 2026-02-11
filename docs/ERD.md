# QuestLegends OS 2.0 - Entity Relationship Diagram

## Database Schema Overview

This document describes the complete database schema for QuestLegends OS 2.0, including all entities, relationships, and constraints.

## Mermaid ERD

\`\`\`mermaid
erDiagram
    users ||--o{ user_franchisee_access : "has access to"
    users ||--o{ deals : "responsible for"
    users ||--o{ personnel : "linked to"
    users ||--o{ notifications : "receives"
    users ||--o{ knowledge_base : "authors"
    users ||--o{ custom_roles : "creates"
    users ||--o{ user_permissions : "has permissions"
    users ||--o{ refresh_tokens : "has tokens"
    users ||--o{ audit_logs : "performs actions"
    
    franchisees ||--o{ user_franchisee_access : "grants access"
    franchisees ||--o{ deals : "location"
    franchisees ||--o{ transactions : "location"
    franchisees ||--o{ expenses : "location"
    franchisees ||--o{ personnel : "location"
    franchisees ||--o{ payroll : "location"
    franchisees ||--o{ custom_roles : "location"
    
    deals ||--o{ deal_activities : "has activities"
    deals ||--o{ transactions : "generates"
    deals ||--o{ game_assignments : "has assignments"
    
    personnel ||--o{ game_assignments : "assigned to games"
    personnel ||--o{ payroll : "receives salary"
    
    knowledge_base ||--o{ kb_files : "has files"
    
    custom_roles ||--o{ user_permissions : "defines permissions"
    
    users {
        uuid id PK
        string email UK
        string password_hash
        string name
        enum role
        string phone
        string telegram_id UK
        string avatar_url
        boolean is_active
        timestamp last_login
        timestamp created_at
        timestamp updated_at
    }
    
    franchisees {
        uuid id PK
        string name
        string location
        text address
        string manager_name
        uuid owner_user_id FK
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    user_franchisee_access {
        uuid id PK
        uuid user_id FK
        uuid franchisee_id FK
        timestamp granted_at
    }
    
    deals {
        uuid id PK
        string title
        string stage
        decimal amount
        string source
        enum priority
        integer participants
        string package
        timestamp game_date
        decimal check_per_person
        integer animators_count
        decimal animator_rate
        decimal host_rate
        decimal dj_rate
        uuid location_id FK
        uuid responsible_user_id FK
        string contact_name
        string contact_phone
        string contact_email
        string contact_company
        string contact_social_vk
        string contact_social_telegram
        string contact_social_instagram
        timestamp created_at
        timestamp updated_at
    }
    
    deal_activities {
        uuid id PK
        uuid deal_id FK
        enum type
        uuid user_id FK
        string user_name
        text content
        enum status
        timestamp created_at
    }
    
    transactions {
        uuid id PK
        date date
        string amo_deal_id
        uuid deal_id FK
        uuid location_id FK
        integer participants_count
        decimal check_per_person
        integer animators_count
        decimal animator_rate
        decimal host_rate
        decimal dj_rate
        decimal total_revenue
        decimal royalty_amount
        decimal fot_calculation
        jsonb historical_rates
        string idempotency_key UK
        enum status
        timestamp created_at
        timestamp updated_at
    }
    
    expenses {
        uuid id PK
        uuid location_id FK
        date date
        string category
        decimal amount
        text description
        text receipt_url
        enum status
        uuid approved_by FK
        timestamp approved_at
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    personnel {
        uuid id PK
        uuid location_id FK
        string name
        string role
        string phone
        string email
        string telegram_id
        enum status
        date join_date
        text notes
        uuid user_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    game_assignments {
        uuid id PK
        uuid deal_id FK
        uuid personnel_id FK
        string role
        uuid assigned_by FK
        timestamp assigned_at
    }
    
    payroll {
        uuid id PK
        uuid location_id FK
        uuid personnel_id FK
        string period
        decimal base_salary
        decimal bonus
        decimal deductions
        decimal total
        integer games_count
        text notes
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    notifications {
        uuid id PK
        uuid user_id FK
        string type
        string title
        text message
        jsonb metadata
        boolean is_read
        timestamp created_at
    }
    
    knowledge_base {
        uuid id PK
        string title
        text content
        string category
        uuid author_id FK
        boolean is_published
        integer view_count
        timestamp created_at
        timestamp updated_at
    }
    
    kb_files {
        uuid id PK
        uuid article_id FK
        string file_name
        text file_url
        bigint file_size
        string file_type
        uuid uploaded_by FK
        timestamp uploaded_at
    }
    
    custom_roles {
        uuid id PK
        uuid location_id FK
        string role_name
        text description
        jsonb permissions
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    user_permissions {
        uuid id PK
        uuid user_id FK
        uuid granted_by FK
        uuid location_id FK
        uuid custom_role_id FK
        jsonb permissions
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    webhook_logs {
        uuid id PK
        string event_type
        jsonb payload
        text endpoint_url
        integer status_code
        text response
        text error
        timestamp created_at
    }
    
    refresh_tokens {
        uuid id PK
        uuid user_id FK
        text token UK
        timestamp expires_at
        timestamp created_at
    }
    
    audit_logs {
        uuid id PK
        uuid user_id FK
        string user_email
        string entity_type
        uuid entity_id
        enum action
        jsonb old_values
        jsonb new_values
        text ip_address
        text user_agent
        timestamp created_at
    }
\`\`\`

## Entity Descriptions

### Core Entities

#### users
User accounts with role-based access control. Supports 4 roles: uk (Management Company), franchisee (Franchise Owner), admin (Location Administrator), employee (Staff).

#### franchisees
Physical locations/franchises in the network. Each has owner and can have multiple users with access.

#### user_franchisee_access
Junction table managing which users have access to which franchisees.

### CRM Entities

#### deals
Sales pipeline for both B2C (games) and B2B (franchise sales). Tracks all customer interactions and game bookings.

#### deal_activities
Activity feed for deals including comments, tasks, events, and status changes.

### ERP Entities

#### transactions
Completed games with financial calculations. Auto-created when deal reaches "Игра проведена" stage.

#### expenses
Operating expenses for franchisees (rent, utilities, marketing, equipment).

### Personnel Entities

#### personnel
Staff members at each location (animators, hosts, DJs, administrators).

#### game_assignments
Assignment of personnel to specific games/deals.

#### payroll
Monthly salary calculations for personnel.

### System Entities

#### notifications
In-app notification system for all users.

#### knowledge_base
Internal wiki/documentation system.

#### kb_files
File attachments for knowledge base articles.

#### custom_roles
Custom role definitions for delegated access within franchisees.

#### user_permissions
Fine-grained permission assignments.

#### webhook_logs
Audit trail for all outgoing webhook calls.

#### refresh_tokens
JWT refresh tokens for authentication.

#### audit_logs
Complete audit trail of all data changes.

## Key Relationships

1. **User ↔ Franchisee**: Many-to-many through user_franchisee_access
2. **Deal → Transaction**: One-to-one when game is completed
3. **Deal → Activities**: One-to-many activity log
4. **Deal → Assignments**: Many-to-many with personnel
5. **Personnel ↔ Payroll**: One-to-many salary records
6. **Franchisee → All Operations**: One-to-many for deals, transactions, expenses, personnel

## Indexes Strategy

### Primary Indexes (automatically created on PKs and UKs)
- All id columns (PRIMARY KEY)
- users.email, users.telegram_id (UNIQUE)
- transactions.idempotency_key (UNIQUE)
- refresh_tokens.token (UNIQUE)

### Foreign Key Indexes
- All FK columns for join optimization

### Composite Indexes
\`\`\`sql
CREATE INDEX idx_deals_location_stage ON deals(location_id, stage);
CREATE INDEX idx_transactions_location_date ON transactions(location_id, date);
CREATE INDEX idx_transactions_date_status ON transactions(date, status);
CREATE INDEX idx_expenses_location_date ON expenses(location_id, date);
CREATE INDEX idx_expenses_date_category ON expenses(date, category);
CREATE INDEX idx_personnel_location_status ON personnel(location_id, status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
\`\`\`

## Constraints

### Check Constraints
\`\`\`sql
ALTER TABLE users ADD CONSTRAINT chk_user_role 
  CHECK (role IN ('uk', 'franchisee', 'admin', 'employee'));

ALTER TABLE deals ADD CONSTRAINT chk_deal_priority 
  CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE transactions ADD CONSTRAINT chk_transaction_status 
  CHECK (status IN ('completed', 'pending', 'cancelled'));

ALTER TABLE personnel ADD CONSTRAINT chk_personnel_status 
  CHECK (status IN ('active', 'on_leave', 'inactive'));

ALTER TABLE expenses ADD CONSTRAINT chk_expense_status 
  CHECK (status IN ('pending', 'approved', 'rejected'));
\`\`\`

### Unique Constraints
\`\`\`sql
ALTER TABLE user_franchisee_access 
  ADD CONSTRAINT uk_user_franchisee UNIQUE (user_id, franchisee_id);

ALTER TABLE game_assignments 
  ADD CONSTRAINT uk_deal_personnel_role UNIQUE (deal_id, personnel_id, role);

ALTER TABLE payroll 
  ADD CONSTRAINT uk_personnel_period UNIQUE (personnel_id, period);
\`\`\`

## Data Types

- **uuid**: Universally unique identifiers for all primary keys
- **decimal(12,2)**: Financial amounts (supports up to 9,999,999,999.99)
- **jsonb**: Structured data (permissions, metadata, historical_rates)
- **enum/varchar**: Status and type fields
- **timestamp**: All datetime fields with timezone support
- **date**: Date-only fields (payroll period, transaction date)
\`\`\`
