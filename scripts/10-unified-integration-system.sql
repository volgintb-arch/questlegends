-- Unified Integration System Schema
-- Поддерживает каналы: Telegram, Instagram, VK, WhatsApp, Avito, MAX
-- Архитектура: канал-агностичная, с маршрутизацией в B2B/B2C CRM

-- Drop old tables if exist
DROP TABLE IF EXISTS SocialMediaConfig CASCADE;
DROP TABLE IF EXISTS LeadTrigger CASCADE;
DROP TABLE IF EXISTS LeadTemplate CASCADE;
DROP TABLE IF EXISTS AutoResponseTemplate CASCADE;

-- Main Integration table
CREATE TABLE IF NOT EXISTS Integration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('uk', 'franchisee')),
  owner_id UUID, -- NULL для УК, franchisee_id для франчайзи
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('telegram', 'instagram', 'vk', 'whatsapp', 'avito', 'max')),
  
  -- Credentials (encrypted в production)
  credentials JSONB NOT NULL, -- { bot_token, api_key, access_token, etc }
  
  -- Webhook configuration
  webhook_url TEXT, -- Генерируется автоматически
  webhook_secret TEXT,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  auto_lead_creation BOOLEAN DEFAULT true,
  
  -- Auto-assignment strategy
  assignment_strategy VARCHAR(50) DEFAULT 'first_admin' CHECK (assignment_strategy IN ('first_admin', 'round_robin', 'default_user')),
  default_assignee_id UUID REFERENCES "User"(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP,
  
  UNIQUE(owner_type, owner_id, channel)
);

-- Trigger rules for auto lead creation
CREATE TABLE IF NOT EXISTS TriggerRule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES Integration(id) ON DELETE CASCADE,
  
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('first_message', 'keywords', 'always')),
  
  -- Keywords configuration
  keywords TEXT[], -- ["купить франшизу", "сколько стоит", "хочу открыть"]
  keywords_match_type VARCHAR(20) DEFAULT 'any' CHECK (keywords_match_type IN ('any', 'all')),
  
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Порядок применения правил
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Normalized inbound messages (все каналы в одном формате)
CREATE TABLE IF NOT EXISTS InboundMessage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES Integration(id) ON DELETE CASCADE,
  
  -- Normalized fields
  channel VARCHAR(50) NOT NULL,
  external_user_id TEXT NOT NULL, -- telegram_id, instagram_username, vk_id, etc
  username TEXT,
  phone TEXT,
  message_text TEXT,
  
  -- Attachments
  attachments JSONB, -- [{ type: 'image', url: '...' }, { type: 'video', url: '...' }]
  
  -- Owner context
  owner_type VARCHAR(20) NOT NULL,
  owner_id UUID,
  
  -- Lead association
  lead_id UUID, -- NULL если лид не создан
  lead_type VARCHAR(10), -- 'b2b' или 'b2c'
  
  -- Raw payload для отладки
  raw_payload JSONB,
  
  -- Timestamps
  received_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error')),
  error_message TEXT,
  
  -- Индексы для быстрого поиска
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lead Deduplication tracking
CREATE TABLE IF NOT EXISTS LeadDeduplication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES Integration(id) ON DELETE CASCADE,
  
  channel VARCHAR(50) NOT NULL,
  external_user_id TEXT NOT NULL,
  phone TEXT,
  
  lead_id UUID, -- Ссылка на созданный лид (GameLead или B2BDeal)
  lead_type VARCHAR(10) NOT NULL, -- 'b2b' или 'b2c'
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(channel, external_user_id)
);

-- Integration statistics
CREATE TABLE IF NOT EXISTS IntegrationStats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES Integration(id) ON DELETE CASCADE,
  
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  messages_received INTEGER DEFAULT 0,
  leads_created INTEGER DEFAULT 0,
  duplicates_prevented INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(integration_id, date)
);

-- Indexes для производительности
CREATE INDEX IF NOT EXISTS idx_integration_owner ON Integration(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_integration_channel ON Integration(channel);
CREATE INDEX IF NOT EXISTS idx_inbound_message_integration ON InboundMessage(integration_id);
CREATE INDEX IF NOT EXISTS idx_inbound_message_external_user ON InboundMessage(channel, external_user_id);
CREATE INDEX IF NOT EXISTS idx_inbound_message_created ON InboundMessage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_dedup_lookup ON LeadDeduplication(channel, external_user_id);
CREATE INDEX IF NOT EXISTS idx_trigger_rule_integration ON TriggerRule(integration_id);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_integration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER integration_updated
  BEFORE UPDATE ON Integration
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_timestamp();

COMMENT ON TABLE Integration IS 'Unified integration table for all social media and messenger channels';
COMMENT ON TABLE InboundMessage IS 'Normalized inbound messages from all channels';
COMMENT ON TABLE TriggerRule IS 'Rules for automatic lead creation based on keywords or first message';
COMMENT ON TABLE LeadDeduplication IS 'Tracks created leads to prevent duplicates';
