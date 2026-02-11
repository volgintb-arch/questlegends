-- Update Integration channel constraint to only allow 5 channels
-- Avito, Telegram, Instagram, VK, WhatsApp

ALTER TABLE integration DROP CONSTRAINT IF EXISTS integration_channel_check;
ALTER TABLE integration ADD CONSTRAINT integration_channel_check 
  CHECK (channel IN ('telegram', 'instagram', 'vk', 'whatsapp', 'avito'));
