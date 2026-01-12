-- Add migration status field to questions_dev table
-- Run this in your Supabase SQL Editor

-- Add ready_for_prod field to track questions flagged for migration
ALTER TABLE questions_dev 
ADD COLUMN IF NOT EXISTS ready_for_prod BOOLEAN DEFAULT FALSE;

-- Add index for faster queries on flagged questions
CREATE INDEX IF NOT EXISTS idx_questions_dev_ready_for_prod 
ON questions_dev(ready_for_prod) 
WHERE ready_for_prod = TRUE;

-- Add comment to explain the field
COMMENT ON COLUMN questions_dev.ready_for_prod IS 
  'Flag indicating this question is approved and ready to be migrated to production';




