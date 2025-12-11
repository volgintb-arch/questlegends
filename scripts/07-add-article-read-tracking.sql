-- Таблица для отслеживания прочитанных статей сотрудниками
CREATE TABLE IF NOT EXISTS "ArticleReadStatus" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "articleId" TEXT NOT NULL REFERENCES "KnowledgeArticle"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "readAt" TIMESTAMP DEFAULT NOW(),
  "isCompleted" BOOLEAN DEFAULT false,
  "completedAt" TIMESTAMP,
  UNIQUE("articleId", "userId")
);

-- Добавляем поле для видео URL в статьи
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- Добавляем поле для типа файла (для просмотра в браузере)
ALTER TABLE "KnowledgeFile" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
