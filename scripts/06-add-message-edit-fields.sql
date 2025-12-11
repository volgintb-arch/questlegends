-- Add isEdited and updatedAt columns to Message table for tracking edited messages

ALTER TABLE "Message" 
ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster queries on edited messages
CREATE INDEX IF NOT EXISTS "idx_message_isEdited" ON "Message"("isEdited");

-- Add comment to explain the columns
COMMENT ON COLUMN "Message"."isEdited" IS 'Indicates if the message has been edited after creation';
COMMENT ON COLUMN "Message"."updatedAt" IS 'Timestamp of the last message update';
