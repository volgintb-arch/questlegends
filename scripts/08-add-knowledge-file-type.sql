-- Add type column to KnowledgeFile table
ALTER TABLE "KnowledgeFile" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'other';
