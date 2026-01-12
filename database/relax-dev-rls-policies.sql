-- Relax RLS Policies for Dev Tables
-- This allows unauthenticated inserts/updates on dev tables for import scripts
-- Run this if you're using the anon key instead of service_role key

-- ============================================
-- UPDATE DEV TABLE RLS POLICIES
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Dev categories can be inserted by authenticated users" ON categories_dev;
DROP POLICY IF EXISTS "Dev categories can be updated by authenticated users" ON categories_dev;
DROP POLICY IF EXISTS "Dev categories can be deleted by authenticated users" ON categories_dev;

DROP POLICY IF EXISTS "Dev questions can be inserted by authenticated users" ON questions_dev;
DROP POLICY IF EXISTS "Dev questions can be updated by authenticated users" ON questions_dev;
DROP POLICY IF EXISTS "Dev questions can be deleted by authenticated users" ON questions_dev;

-- Create more permissive policies for dev tables (allows unauthenticated access)
-- NOTE: This is safe for dev tables since they're isolated from production

-- Categories Dev: Allow anyone to insert/update/delete (dev only!)
CREATE POLICY "Dev categories can be inserted by anyone"
  ON categories_dev FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dev categories can be updated by anyone"
  ON categories_dev FOR UPDATE
  USING (true);

CREATE POLICY "Dev categories can be deleted by anyone"
  ON categories_dev FOR DELETE
  USING (true);

-- Questions Dev: Allow anyone to insert/update/delete (dev only!)
CREATE POLICY "Dev questions can be inserted by anyone"
  ON questions_dev FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dev questions can be updated by anyone"
  ON questions_dev FOR UPDATE
  USING (true);

CREATE POLICY "Dev questions can be deleted by anyone"
  ON questions_dev FOR DELETE
  USING (true);

-- Game Sessions Dev: Keep user-specific for game data
-- (These are fine as-is since games require authentication anyway)

-- Game Answers Dev: Keep user-specific for game data
-- (These are fine as-is since games require authentication anyway)

-- Category Stats Dev: Allow inserts/updates (dev only!)
DROP POLICY IF EXISTS "Users can insert own dev category stats" ON category_stats_dev;
DROP POLICY IF EXISTS "Users can update own dev category stats" ON category_stats_dev;

CREATE POLICY "Dev category stats can be inserted by anyone"
  ON category_stats_dev FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dev category stats can be updated by anyone"
  ON category_stats_dev FOR UPDATE
  USING (true);

COMMENT ON POLICY "Dev categories can be inserted by anyone" ON categories_dev IS 
  'Permissive policy for dev table - allows import scripts to work without authentication';

COMMENT ON POLICY "Dev questions can be inserted by anyone" ON questions_dev IS 
  'Permissive policy for dev table - allows import scripts to work without authentication';




