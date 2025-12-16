-- =====================================================
-- Leaderboard System for Bible Trivia Game
-- =====================================================
-- Features:
-- - Global and per-category rankings
-- - Time-based filtering (all-time, weekly, monthly)
-- - Privacy settings
-- - Efficient ranking queries
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Add leaderboard settings to profiles
-- =====================================================

-- Add privacy and display settings to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS show_on_leaderboard BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_display ON profiles(show_on_leaderboard, display_name);

-- =====================================================
-- 2. Create leaderboard_entries view
-- =====================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS leaderboard_global_alltime CASCADE;
DROP VIEW IF EXISTS leaderboard_global_weekly CASCADE;
DROP VIEW IF EXISTS leaderboard_global_monthly CASCADE;

-- All-time global leaderboard
CREATE OR REPLACE VIEW leaderboard_global_alltime AS
SELECT
  us.user_id,
  p.display_name,
  p.email,
  us.total_games,
  us.total_correct,
  us.total_questions,
  CASE
    WHEN us.total_questions > 0
    THEN ROUND((us.total_correct::DECIMAL / us.total_questions::DECIMAL) * 100, 2)
    ELSE 0
  END as accuracy_percentage,
  us.best_streak,
  us.last_played,
  ROW_NUMBER() OVER (ORDER BY us.total_correct DESC, us.total_games ASC) as rank
FROM user_stats us
INNER JOIN profiles p ON us.user_id = p.id
WHERE p.show_on_leaderboard = true
  AND us.total_games > 0
ORDER BY us.total_correct DESC, us.total_games ASC;

-- Weekly leaderboard (last 7 days)
CREATE OR REPLACE VIEW leaderboard_global_weekly AS
SELECT
  gs.user_id,
  p.display_name,
  p.email,
  COUNT(DISTINCT gs.id) as games_played,
  SUM(gs.correct_answers) as total_correct,
  SUM(gs.total_questions) as total_questions,
  CASE
    WHEN SUM(gs.total_questions) > 0
    THEN ROUND((SUM(gs.correct_answers)::DECIMAL / SUM(gs.total_questions)::DECIMAL) * 100, 2)
    ELSE 0
  END as accuracy_percentage,
  MAX(gs.score) as best_score,
  ROW_NUMBER() OVER (ORDER BY SUM(gs.correct_answers) DESC, COUNT(DISTINCT gs.id) ASC) as rank
FROM game_sessions gs
INNER JOIN profiles p ON gs.user_id = p.id
WHERE p.show_on_leaderboard = true
  AND gs.completed_at >= NOW() - INTERVAL '7 days'
  AND gs.is_completed = true
GROUP BY gs.user_id, p.display_name, p.email
ORDER BY SUM(gs.correct_answers) DESC, COUNT(DISTINCT gs.id) ASC;

-- Monthly leaderboard (last 30 days)
CREATE OR REPLACE VIEW leaderboard_global_monthly AS
SELECT
  gs.user_id,
  p.display_name,
  p.email,
  COUNT(DISTINCT gs.id) as games_played,
  SUM(gs.correct_answers) as total_correct,
  SUM(gs.total_questions) as total_questions,
  CASE
    WHEN SUM(gs.total_questions) > 0
    THEN ROUND((SUM(gs.correct_answers)::DECIMAL / SUM(gs.total_questions)::DECIMAL) * 100, 2)
    ELSE 0
  END as accuracy_percentage,
  MAX(gs.score) as best_score,
  ROW_NUMBER() OVER (ORDER BY SUM(gs.correct_answers) DESC, COUNT(DISTINCT gs.id) ASC) as rank
FROM game_sessions gs
INNER JOIN profiles p ON gs.user_id = p.id
WHERE p.show_on_leaderboard = true
  AND gs.completed_at >= NOW() - INTERVAL '30 days'
  AND gs.is_completed = true
GROUP BY gs.user_id, p.display_name, p.email
ORDER BY SUM(gs.correct_answers) DESC, COUNT(DISTINCT gs.id) ASC;

-- =====================================================
-- 3. Create category-specific leaderboard function
-- =====================================================

-- Function to get category leaderboard
CREATE OR REPLACE FUNCTION get_category_leaderboard(
  p_category_id UUID,
  p_period TEXT DEFAULT 'alltime', -- 'alltime', 'weekly', 'monthly'
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  user_id UUID,
  display_name VARCHAR,
  email TEXT,
  games_played BIGINT,
  total_correct BIGINT,
  total_questions BIGINT,
  accuracy_percentage NUMERIC,
  rank BIGINT
) AS $$
BEGIN
  IF p_period = 'weekly' THEN
    RETURN QUERY
    SELECT
      cs.user_id,
      p.display_name,
      p.email,
      cs.games_played::BIGINT,
      cs.correct_answers::BIGINT,
      cs.questions_answered::BIGINT,
      CASE
        WHEN cs.questions_answered > 0
        THEN ROUND((cs.correct_answers::DECIMAL / cs.questions_answered::DECIMAL) * 100, 2)
        ELSE 0
      END as accuracy_percentage,
      ROW_NUMBER() OVER (ORDER BY cs.correct_answers DESC, cs.games_played ASC) as rank
    FROM category_stats cs
    INNER JOIN profiles p ON cs.user_id = p.id
    WHERE cs.category_id = p_category_id
      AND p.show_on_leaderboard = true
      AND cs.last_played >= NOW() - INTERVAL '7 days'
      AND cs.games_played > 0
    ORDER BY cs.correct_answers DESC, cs.games_played ASC
    LIMIT p_limit;

  ELSIF p_period = 'monthly' THEN
    RETURN QUERY
    SELECT
      cs.user_id,
      p.display_name,
      p.email,
      cs.games_played::BIGINT,
      cs.correct_answers::BIGINT,
      cs.questions_answered::BIGINT,
      CASE
        WHEN cs.questions_answered > 0
        THEN ROUND((cs.correct_answers::DECIMAL / cs.questions_answered::DECIMAL) * 100, 2)
        ELSE 0
      END as accuracy_percentage,
      ROW_NUMBER() OVER (ORDER BY cs.correct_answers DESC, cs.games_played ASC) as rank
    FROM category_stats cs
    INNER JOIN profiles p ON cs.user_id = p.id
    WHERE cs.category_id = p_category_id
      AND p.show_on_leaderboard = true
      AND cs.last_played >= NOW() - INTERVAL '30 days'
      AND cs.games_played > 0
    ORDER BY cs.correct_answers DESC, cs.games_played ASC
    LIMIT p_limit;

  ELSE -- alltime
    RETURN QUERY
    SELECT
      cs.user_id,
      p.display_name,
      p.email,
      cs.games_played::BIGINT,
      cs.correct_answers::BIGINT,
      cs.questions_answered::BIGINT,
      CASE
        WHEN cs.questions_answered > 0
        THEN ROUND((cs.correct_answers::DECIMAL / cs.questions_answered::DECIMAL) * 100, 2)
        ELSE 0
      END as accuracy_percentage,
      ROW_NUMBER() OVER (ORDER BY cs.correct_answers DESC, cs.games_played ASC) as rank
    FROM category_stats cs
    INNER JOIN profiles p ON cs.user_id = p.id
    WHERE cs.category_id = p_category_id
      AND p.show_on_leaderboard = true
      AND cs.games_played > 0
    ORDER BY cs.correct_answers DESC, cs.games_played ASC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Create function to get user's rank
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_rank(
  p_user_id UUID,
  p_period TEXT DEFAULT 'alltime', -- 'alltime', 'weekly', 'monthly'
  p_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_rank BIGINT,
  total_players BIGINT,
  user_score BIGINT,
  top_score BIGINT
) AS $$
BEGIN
  IF p_category_id IS NOT NULL THEN
    -- Category-specific rank
    RETURN QUERY
    WITH ranked_players AS (
      SELECT
        cs.user_id,
        cs.correct_answers,
        ROW_NUMBER() OVER (ORDER BY cs.correct_answers DESC, cs.games_played ASC) as rank
      FROM category_stats cs
      INNER JOIN profiles p ON cs.user_id = p.id
      WHERE cs.category_id = p_category_id
        AND p.show_on_leaderboard = true
        AND cs.games_played > 0
    )
    SELECT
      (SELECT rank FROM ranked_players WHERE user_id = p_user_id) as user_rank,
      COUNT(*)::BIGINT as total_players,
      (SELECT correct_answers FROM ranked_players WHERE user_id = p_user_id) as user_score,
      MAX(correct_answers)::BIGINT as top_score
    FROM ranked_players;

  ELSIF p_period = 'weekly' THEN
    -- Weekly global rank
    RETURN QUERY
    WITH ranked_players AS (
      SELECT
        gs.user_id,
        SUM(gs.correct_answers) as score,
        ROW_NUMBER() OVER (ORDER BY SUM(gs.correct_answers) DESC, COUNT(DISTINCT gs.id) ASC) as rank
      FROM game_sessions gs
      INNER JOIN profiles p ON gs.user_id = p.id
      WHERE p.show_on_leaderboard = true
        AND gs.completed_at >= NOW() - INTERVAL '7 days'
        AND gs.is_completed = true
      GROUP BY gs.user_id
    )
    SELECT
      (SELECT rank FROM ranked_players WHERE user_id = p_user_id) as user_rank,
      COUNT(*)::BIGINT as total_players,
      (SELECT score FROM ranked_players WHERE user_id = p_user_id) as user_score,
      MAX(score)::BIGINT as top_score
    FROM ranked_players;

  ELSIF p_period = 'monthly' THEN
    -- Monthly global rank
    RETURN QUERY
    WITH ranked_players AS (
      SELECT
        gs.user_id,
        SUM(gs.correct_answers) as score,
        ROW_NUMBER() OVER (ORDER BY SUM(gs.correct_answers) DESC, COUNT(DISTINCT gs.id) ASC) as rank
      FROM game_sessions gs
      INNER JOIN profiles p ON gs.user_id = p.id
      WHERE p.show_on_leaderboard = true
        AND gs.completed_at >= NOW() - INTERVAL '30 days'
        AND gs.is_completed = true
      GROUP BY gs.user_id
    )
    SELECT
      (SELECT rank FROM ranked_players WHERE user_id = p_user_id) as user_rank,
      COUNT(*)::BIGINT as total_players,
      (SELECT score FROM ranked_players WHERE user_id = p_user_id) as user_score,
      MAX(score)::BIGINT as top_score
    FROM ranked_players;

  ELSE -- alltime
    RETURN QUERY
    WITH ranked_players AS (
      SELECT
        us.user_id,
        us.total_correct,
        ROW_NUMBER() OVER (ORDER BY us.total_correct DESC, us.total_games ASC) as rank
      FROM user_stats us
      INNER JOIN profiles p ON us.user_id = p.id
      WHERE p.show_on_leaderboard = true
        AND us.total_games > 0
    )
    SELECT
      (SELECT rank FROM ranked_players WHERE user_id = p_user_id) as user_rank,
      COUNT(*)::BIGINT as total_players,
      (SELECT total_correct FROM ranked_players WHERE user_id = p_user_id) as user_score,
      MAX(total_correct)::BIGINT as top_score
    FROM ranked_players;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. RLS Policies for profile updates
-- =====================================================

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can update their own display name and privacy settings
CREATE POLICY "Users can update own profile settings"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- 6. Indexes for performance
-- =====================================================

-- Indexes on game_sessions for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_completed
  ON game_sessions(user_id, completed_at DESC)
  WHERE is_completed = true;

CREATE INDEX IF NOT EXISTS idx_game_sessions_weekly
  ON game_sessions(completed_at DESC, correct_answers DESC)
  WHERE is_completed = true AND completed_at >= NOW() - INTERVAL '7 days';

CREATE INDEX IF NOT EXISTS idx_game_sessions_monthly
  ON game_sessions(completed_at DESC, correct_answers DESC)
  WHERE is_completed = true AND completed_at >= NOW() - INTERVAL '30 days';

-- Indexes on category_stats for category leaderboards
CREATE INDEX IF NOT EXISTS idx_category_stats_category_score
  ON category_stats(category_id, correct_answers DESC, games_played ASC);

CREATE INDEX IF NOT EXISTS idx_category_stats_last_played
  ON category_stats(category_id, last_played DESC);

-- Index on user_stats for global leaderboard
CREATE INDEX IF NOT EXISTS idx_user_stats_global_rank
  ON user_stats(total_correct DESC, total_games ASC)
  WHERE total_games > 0;

-- =====================================================
-- 7. Helper function to update display name
-- =====================================================

CREATE OR REPLACE FUNCTION update_display_name(
  p_user_id UUID,
  p_display_name VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles
  SET
    display_name = p_display_name,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. Helper function to toggle leaderboard visibility
-- =====================================================

CREATE OR REPLACE FUNCTION toggle_leaderboard_visibility(
  p_user_id UUID,
  p_show BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles
  SET
    show_on_leaderboard = p_show,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETE
-- =====================================================
-- Run this migration in Supabase SQL Editor
-- =====================================================
