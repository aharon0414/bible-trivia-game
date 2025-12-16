-- Migration: Enhance Questions with Educational Fields
-- Purpose: Add teaching_notes for deeper educational content
-- Date: 2025-12-13

-- ============================================================================
-- PART 1: Add Educational Fields to Development Questions
-- ============================================================================

-- Add teaching_notes field (deeper theological/historical context)
-- This is separate from 'explanation' which is shown after answering
-- teaching_notes can include cross-references, theological significance, etc.
ALTER TABLE questions_dev
ADD COLUMN IF NOT EXISTS teaching_notes TEXT;

-- Add tags for flexible categorization (stored as JSON array)
-- Examples: ["Old Testament", "Covenant Theology", "Moses"], etc.
ALTER TABLE questions_dev
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add created_at and updated_at timestamps if they don't exist
ALTER TABLE questions_dev
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE questions_dev
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add created_by field to track who created the question
ALTER TABLE questions_dev
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- ============================================================================
-- PART 2: Add Educational Fields to Production Questions
-- ============================================================================

-- Add teaching_notes field
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS teaching_notes TEXT;

-- Add tags
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add timestamps if they don't exist
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add created_by field
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- ============================================================================
-- PART 3: Create Indexes for Performance
-- ============================================================================

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_questions_dev_created ON questions_dev(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at DESC);

-- Index on updated_at for finding recently modified
CREATE INDEX IF NOT EXISTS idx_questions_dev_updated ON questions_dev(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_updated ON questions(updated_at DESC);

-- GIN index for tags array (enables fast tag searches)
CREATE INDEX IF NOT EXISTS idx_questions_dev_tags ON questions_dev USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags);

-- ============================================================================
-- PART 4: Update Existing Questions with Sample Teaching Notes
-- ============================================================================

-- Add teaching notes to Moses question (if it exists)
UPDATE questions_dev
SET
  teaching_notes = 'Moses is one of the most significant figures in the Old Testament. As mediator of the Old Covenant, he foreshadows Christ as mediator of the New Covenant (Hebrews 3:1-6). The exodus from Egypt is the defining event of Israel''s identity and prefigures redemption through Christ (1 Corinthians 10:1-4).',
  tags = ARRAY['Pentateuch', 'Exodus', 'Leadership', 'Covenant', 'Typology']
WHERE question_text LIKE '%led the Israelites out of Egypt%'
  AND teaching_notes IS NULL;

-- Add teaching notes to Judas question (if it exists)
UPDATE questions_dev
SET
  teaching_notes = 'Judas'' betrayal fulfills Old Testament prophecy (Psalm 41:9, Zechariah 11:12-13) and demonstrates the mystery of divine sovereignty and human responsibility. Despite being chosen as an apostle, Judas'' love of money led to his downfall, serving as a warning about the danger of greed (1 Timothy 6:10).',
  tags = ARRAY['Gospels', 'Betrayal', 'Prophecy Fulfilled', 'Warning', 'Twelve Apostles']
WHERE question_text LIKE '%betrayed Jesus for thirty pieces of silver%'
  AND teaching_notes IS NULL;

-- Mirror to production (if questions exist there)
UPDATE questions
SET
  teaching_notes = 'Moses is one of the most significant figures in the Old Testament. As mediator of the Old Covenant, he foreshadows Christ as mediator of the New Covenant (Hebrews 3:1-6). The exodus from Egypt is the defining event of Israel''s identity and prefigures redemption through Christ (1 Corinthians 10:1-4).',
  tags = ARRAY['Pentateuch', 'Exodus', 'Leadership', 'Covenant', 'Typology']
WHERE question_text LIKE '%led the Israelites out of Egypt%'
  AND teaching_notes IS NULL;

UPDATE questions
SET
  teaching_notes = 'Judas'' betrayal fulfills Old Testament prophecy (Psalm 41:9, Zechariah 11:12-13) and demonstrates the mystery of divine sovereignty and human responsibility. Despite being chosen as an apostle, Judas'' love of money led to his downfall, serving as a warning about the danger of greed (1 Timothy 6:10).',
  tags = ARRAY['Gospels', 'Betrayal', 'Prophecy Fulfilled', 'Warning', 'Twelve Apostles']
WHERE question_text LIKE '%betrayed Jesus for thirty pieces of silver%'
  AND teaching_notes IS NULL;

-- ============================================================================
-- NOTES
-- ============================================================================
-- Run this migration after 002_enhance_categories.sql
-- This is safe to run multiple times (uses IF NOT EXISTS)
--
-- Distinction between explanation and teaching_notes:
--   - explanation: Short (1-2 sentences) shown immediately after answering
--   - teaching_notes: Deeper content for study mode, cross-references, theological significance
--
-- The 'explanation' field answers: "Why is this the correct answer?"
-- The 'teaching_notes' field answers: "Why is this important theologically/historically?"
--
-- Tags Usage Examples:
--   - Biblical books: "Genesis", "Exodus", "Matthew", "Romans"
--   - Themes: "Covenant", "Redemption", "Faith", "Obedience"
--   - Periods: "Patriarchs", "Judges", "Kingdom Era", "Exile"
--   - Types: "Prophecy Fulfilled", "Typology", "Wisdom", "Commandment"
