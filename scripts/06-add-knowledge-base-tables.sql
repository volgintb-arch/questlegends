-- Create KnowledgeArticle table
CREATE TABLE IF NOT EXISTS "KnowledgeArticle" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  "authorId" TEXT,
  type TEXT NOT NULL DEFAULT 'article',
  tags TEXT[] DEFAULT '{}',
  views INTEGER DEFAULT 0,
  helpful INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "KnowledgeArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE SET NULL
);

-- Create KnowledgeFile table for article attachments
CREATE TABLE IF NOT EXISTS "KnowledgeFile" (
  id TEXT PRIMARY KEY,
  "articleId" TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size TEXT NOT NULL,
  "uploadedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "KnowledgeFile_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "KnowledgeArticle_category_idx" ON "KnowledgeArticle"(category);
CREATE INDEX IF NOT EXISTS "KnowledgeArticle_authorId_idx" ON "KnowledgeArticle"("authorId");
CREATE INDEX IF NOT EXISTS "KnowledgeArticle_createdAt_idx" ON "KnowledgeArticle"("createdAt");
CREATE INDEX IF NOT EXISTS "KnowledgeFile_articleId_idx" ON "KnowledgeFile"("articleId");
