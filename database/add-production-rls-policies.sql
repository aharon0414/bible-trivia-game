-- Add RLS Policies to Production Tables
-- This enables Row Level Security and sets up read/write policies
-- Run this in your Supabase SQL Editor

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CATEGORIES TABLE POLICIES
-- ============================================

-- Option 1: Require authentication to read (recommended for production)
CREATE POLICY "Authenticated users can read categories"
  ON categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Option 2: Allow public reads (uncomment if app needs to read before login)
-- CREATE POLICY "Anyone can read categories"
--   ON categories FOR SELECT
--   USING (true);

-- Note: No INSERT/UPDATE/DELETE policies are created
-- This means only the service role (which bypasses RLS) can modify categories
-- The app uses anon key for reads, so authenticated users can read via the app

-- ============================================
-- QUESTIONS TABLE POLICIES
-- ============================================

-- Option 1: Require authentication to read (recommended for production)
CREATE POLICY "Authenticated users can read questions"
  ON questions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Option 2: Allow public reads (uncomment if app needs to read before login)
-- CREATE POLICY "Anyone can read questions"
--   ON questions FOR SELECT
--   USING (true);

-- Note: No INSERT/UPDATE/DELETE policies are created
-- This means only the service role (which bypasses RLS) can modify questions
-- The app uses anon key for reads, so authenticated users can read via the app

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check RLS status
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('categories', 'questions')
ORDER BY tablename;

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE tablename IN ('categories', 'questions')
ORDER BY tablename, cmd;

-- ============================================
-- NOTES
-- ============================================

-- IMPORTANT:
-- 1. Service role bypasses RLS automatically - it can INSERT/UPDATE/DELETE without policies
-- 2. The app uses anon key for reads
--    - If using "Authenticated users can read": Users must be logged in to read
--    - If using "Anyone can read": Public access (no login required)
-- 3. No write policies = only service role can write (via migration scripts, admin tools, etc.)
-- 4. Authenticated users (via app) can read categories and questions
-- 5. Unauthenticated users: Depends on which SELECT policy you use
--
-- RECOMMENDATION:
-- - Use "Authenticated users can read" if your app requires login before showing questions
-- - Use "Anyone can read" if you want to show questions on home screen before login

-- To test:
-- - Try reading as authenticated user: Should work
-- - Try writing as authenticated user: Should fail (no policy)
-- - Try writing as service role: Should work (bypasses RLS)
