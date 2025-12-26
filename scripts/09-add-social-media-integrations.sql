-- Create tables for social media lead integrations

-- SocialMediaConfig: настройки интеграций с соцсетями для УК или франшизы
CREATE TABLE IF NOT EXISTS "SocialMediaConfig" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "franchiseeId" TEXT,
  "isGlobal" BOOLEAN NOT NULL DEFAULT false,
  "platform" TEXT NOT NULL CHECK ("platform" IN ('instagram', 'facebook', 'vk', 'telegram', 'whatsapp', 'tiktok', 'youtube')),
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "apiKey" TEXT,
  "apiSecret" TEXT,
  "webhookUrl" TEXT,
  "accessToken" TEXT,
  "pageId" TEXT,
  "botToken" TEXT,
  "accountUsername" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "SocialMediaConfig_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- LeadTrigger: ключевые слова для автоматического создания лидов
CREATE TABLE IF NOT EXISTS "LeadTrigger" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "configId" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "autoCreateLead" BOOLEAN NOT NULL DEFAULT true,
  "autoReplyMessage" TEXT,
  "priority" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "LeadTrigger_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SocialMediaConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- LeadTemplate: шаблоны для создания лидов из сообщений
CREATE TABLE IF NOT EXISTS "LeadTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "configId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "defaultPipelineId" TEXT,
  "defaultStageId" TEXT,
  "defaultSource" TEXT,
  "defaultResponsibleId" TEXT,
  "autoAssignRules" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "LeadTemplate_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SocialMediaConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- IncomingMessage: лог всех входящих сообщений из соцсетей
CREATE TABLE IF NOT EXISTS "IncomingMessage" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "configId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderName" TEXT,
  "senderPhone" TEXT,
  "messageText" TEXT NOT NULL,
  "messageType" TEXT DEFAULT 'text',
  "chatUrl" TEXT,
  "rawData" JSONB,
  "isProcessed" BOOLEAN NOT NULL DEFAULT false,
  "leadId" TEXT,
  "processingError" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  
  CONSTRAINT "IncomingMessage_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SocialMediaConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IncomingMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "GameLead"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AutoResponseTemplate: автоответы для разных платформ
CREATE TABLE IF NOT EXISTS "AutoResponseTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "configId" TEXT NOT NULL,
  "triggerType" TEXT NOT NULL CHECK ("triggerType" IN ('keyword_match', 'new_lead', 'working_hours', 'outside_hours', 'fallback')),
  "messageTemplate" TEXT NOT NULL,
  "delay" INTEGER DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "AutoResponseTemplate_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SocialMediaConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "SocialMediaConfig_franchiseeId_idx" ON "SocialMediaConfig"("franchiseeId");
CREATE INDEX IF NOT EXISTS "SocialMediaConfig_platform_idx" ON "SocialMediaConfig"("platform");
CREATE INDEX IF NOT EXISTS "SocialMediaConfig_isGlobal_idx" ON "SocialMediaConfig"("isGlobal");
CREATE INDEX IF NOT EXISTS "LeadTrigger_configId_idx" ON "LeadTrigger"("configId");
CREATE INDEX IF NOT EXISTS "LeadTemplate_configId_idx" ON "LeadTemplate"("configId");
CREATE INDEX IF NOT EXISTS "IncomingMessage_configId_idx" ON "IncomingMessage"("configId");
CREATE INDEX IF NOT EXISTS "IncomingMessage_senderId_idx" ON "IncomingMessage"("senderId");
CREATE INDEX IF NOT EXISTS "IncomingMessage_isProcessed_idx" ON "IncomingMessage"("isProcessed");
CREATE INDEX IF NOT EXISTS "IncomingMessage_receivedAt_idx" ON "IncomingMessage"("receivedAt");
CREATE INDEX IF NOT EXISTS "AutoResponseTemplate_configId_idx" ON "AutoResponseTemplate"("configId");
