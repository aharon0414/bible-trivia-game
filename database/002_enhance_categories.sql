-- Migration: Enhance Categories with Educational Fields
-- Purpose: Add educational metadata to support progressive learning
-- Date: 2025-12-13

-- ============================================================================
-- PART 1: Add Educational Fields to Development Categories
-- ============================================================================

-- Add theme field (theological or topical theme)
ALTER TABLE categories_dev
ADD COLUMN IF NOT EXISTS theme VARCHAR(100);

-- Add biblical_period field (Pentateuch, Gospels, Epistles, etc.)
ALTER TABLE categories_dev
ADD COLUMN IF NOT EXISTS biblical_period VARCHAR(100);

-- Add learning_objective field (what students will learn)
ALTER TABLE categories_dev
ADD COLUMN IF NOT EXISTS learning_objective TEXT;

-- Add difficulty_range field (suggested difficulty progression)
ALTER TABLE categories_dev
ADD COLUMN IF NOT EXISTS difficulty_range VARCHAR(50);

-- Add created_at and updated_at timestamps if they don't exist
ALTER TABLE categories_dev
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE categories_dev
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================================================
-- PART 2: Add Educational Fields to Production Categories
-- ============================================================================

-- Add theme field
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS theme VARCHAR(100);

-- Add biblical_period field
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS biblical_period VARCHAR(100);

-- Add learning_objective field
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS learning_objective TEXT;

-- Add difficulty_range field
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS difficulty_range VARCHAR(50);

-- Add timestamps if they don't exist
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================================================
-- PART 3: Update Existing Categories with Sample Educational Data
-- ============================================================================

-- Update Characters category (dev)
UPDATE categories_dev
SET
  theme = 'Character Studies',
  biblical_period = 'Comprehensive',
  learning_objective = 'Understand the lives, choices, and faith journeys of key biblical figures and how they relate to God''s redemptive plan.',
  difficulty_range = 'beginner-scholar'
WHERE name = 'Characters';

-- Update Events category (dev)
UPDATE categories_dev
SET
  theme = 'Redemptive History',
  biblical_period = 'Comprehensive',
  learning_objective = 'Learn the major events in biblical history and their theological significance in God''s plan of salvation.',
  difficulty_range = 'beginner-scholar'
WHERE name = 'Events';

-- Update Locations category (dev)
UPDATE categories_dev
SET
  theme = 'Biblical Geography',
  biblical_period = 'Comprehensive',
  learning_objective = 'Discover the geographical context of biblical events and understand how location impacts the biblical narrative.',
  difficulty_range = 'beginner-intermediate'
WHERE name = 'Locations';

-- Mirror updates to production categories (if they exist)
UPDATE categories
SET
  theme = 'Character Studies',
  biblical_period = 'Comprehensive',
  learning_objective = 'Understand the lives, choices, and faith journeys of key biblical figures and how they relate to God''s redemptive plan.',
  difficulty_range = 'beginner-scholar'
WHERE name = 'Characters';

UPDATE categories
SET
  theme = 'Redemptive History',
  biblical_period = 'Comprehensive',
  learning_objective = 'Learn the major events in biblical history and their theological significance in God''s plan of salvation.',
  difficulty_range = 'beginner-scholar'
WHERE name = 'Events';

UPDATE categories
SET
  theme = 'Biblical Geography',
  biblical_period = 'Comprehensive',
  learning_objective = 'Discover the geographical context of biblical events and understand how location impacts the biblical narrative.',
  difficulty_range = 'beginner-intermediate'
WHERE name = 'Locations';

-- ============================================================================
-- PART 4: Create Indexes for Performance
-- ============================================================================

-- Index on theme for filtering
CREATE INDEX IF NOT EXISTS idx_categories_dev_theme ON categories_dev(theme);
CREATE INDEX IF NOT EXISTS idx_categories_theme ON categories(theme);

-- Index on biblical_period for filtering
CREATE INDEX IF NOT EXISTS idx_categories_dev_period ON categories_dev(biblical_period);
CREATE INDEX IF NOT EXISTS idx_categories_period ON categories(biblical_period);

-- ============================================================================
-- NOTES
-- ============================================================================
-- Run this migration after creating your dev and prod category tables
-- This is safe to run multiple times (uses IF NOT EXISTS)
--
-- Expected Themes:
--   - Character Studies, Covenant, Redemption, Ethics, Eschatology,
--     Wisdom Literature, Prophecy, Miracles, Parables, etc.
--
-- Expected Biblical Periods:
--   - Pentateuch, Historical Books, Wisdom Literature, Major Prophets,
--     Minor Prophets, Gospels, Acts, Pauline Epistles, General Epistles,
--     Revelation, Comprehensive (spans multiple periods)
--
-- Expected Difficulty Ranges:
--   - beginner-intermediate, intermediate-expert, beginner-scholar, etc.
