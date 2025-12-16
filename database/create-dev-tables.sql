-- Create Development Tables Migration
-- This script creates parallel _dev tables for development/testing
-- Run this in your Supabase SQL Editor

-- ============================================
-- DEV TABLES - Mirror Production Schema
-- ============================================

-- Categories Dev Table
CREATE TABLE IF NOT EXISTS categories_dev (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions Dev Table
CREATE TABLE IF NOT EXISTS questions_dev (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories_dev(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert', 'scholar')),
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank')),
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  bible_reference TEXT,
  explanation TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  ready_for_prod BOOLEAN DEFAULT FALSE,
  times_answered INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries on flagged questions
CREATE INDEX IF NOT EXISTS idx_questions_dev_ready_for_prod 
ON questions_dev(ready_for_prod) 
WHERE ready_for_prod = TRUE;

-- Game Sessions Dev Table
CREATE TABLE IF NOT EXISTS game_sessions_dev (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories_dev(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert', 'scholar')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Game Answers Dev Table
CREATE TABLE IF NOT EXISTS game_answers_dev (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES game_sessions_dev(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions_dev(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_taken_seconds INTEGER
);

-- Category Statistics Dev Table
CREATE TABLE IF NOT EXISTS category_stats_dev (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories_dev(id) ON DELETE CASCADE,
  games_played INTEGER NOT NULL DEFAULT 0,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  average_score DECIMAL NOT NULL DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, category_id)
);

-- ============================================
-- INDEXES FOR DEV TABLES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_questions_dev_category ON questions_dev(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_dev_difficulty ON questions_dev(difficulty);
CREATE INDEX IF NOT EXISTS idx_game_sessions_dev_user ON game_sessions_dev(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_dev_completed ON game_sessions_dev(is_completed);
CREATE INDEX IF NOT EXISTS idx_game_answers_dev_session ON game_answers_dev(session_id);
CREATE INDEX IF NOT EXISTS idx_category_stats_dev_user ON category_stats_dev(user_id);

-- ============================================
-- ROW LEVEL SECURITY FOR DEV TABLES
-- ============================================

-- Enable RLS on dev tables
ALTER TABLE categories_dev ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions_dev ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions_dev ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_answers_dev ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_stats_dev ENABLE ROW LEVEL SECURITY;

-- Categories Dev: Readable by everyone
CREATE POLICY "Dev categories are viewable by everyone"
  ON categories_dev FOR SELECT
  USING (true);

CREATE POLICY "Dev categories can be inserted by authenticated users"
  ON categories_dev FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Dev categories can be updated by authenticated users"
  ON categories_dev FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Dev categories can be deleted by authenticated users"
  ON categories_dev FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Questions Dev: Readable by everyone
CREATE POLICY "Dev questions are viewable by everyone"
  ON questions_dev FOR SELECT
  USING (true);

CREATE POLICY "Dev questions can be inserted by authenticated users"
  ON questions_dev FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Dev questions can be updated by authenticated users"
  ON questions_dev FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Dev questions can be deleted by authenticated users"
  ON questions_dev FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Game Sessions Dev: Users can only see and modify their own sessions
CREATE POLICY "Users can view own dev game sessions"
  ON game_sessions_dev FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own dev game sessions"
  ON game_sessions_dev FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dev game sessions"
  ON game_sessions_dev FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dev game sessions"
  ON game_sessions_dev FOR DELETE
  USING (auth.uid() = user_id);

-- Game Answers Dev: Users can only see and modify answers for their sessions
CREATE POLICY "Users can view dev answers for own sessions"
  ON game_answers_dev FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions_dev
      WHERE game_sessions_dev.id = game_answers_dev.session_id
      AND game_sessions_dev.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create dev answers for own sessions"
  ON game_answers_dev FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions_dev
      WHERE game_sessions_dev.id = game_answers_dev.session_id
      AND game_sessions_dev.user_id = auth.uid()
    )
  );

-- Category Stats Dev: Users can view all stats but only modify their own
CREATE POLICY "Dev category stats are viewable by everyone"
  ON category_stats_dev FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own dev category stats"
  ON category_stats_dev FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dev category stats"
  ON category_stats_dev FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- SEED DEV TABLES WITH SAMPLE DATA
-- ============================================

-- Insert sample categories into dev
INSERT INTO categories_dev (name, description, sort_order) VALUES
  ('Characters', 'Questions about important biblical figures', 1),
  ('Events', 'Questions about significant biblical events', 2),
  ('Locations', 'Questions about biblical places and geography', 3),
  ('Parables', 'Questions about parables taught by Jesus', 4),
  ('Themes', 'Questions about major biblical themes', 5),
  ('Theology/Doctrine', 'Questions about theological concepts', 6),
  ('Guess that Quote', 'Identify the source of biblical quotes', 7),
  ('Church History', 'Questions about early church and Christian history', 8)
ON CONFLICT DO NOTHING;

-- Insert a few sample questions into dev
INSERT INTO questions_dev (category_id, difficulty, question_type, question_text, correct_answer, option_a, option_b, option_c, option_d, bible_reference, explanation) VALUES
  (
    (SELECT id FROM categories_dev WHERE name = 'Characters'),
    'beginner',
    'multiple_choice',
    'Who built the ark?',
    'Noah',
    'Noah',
    'Moses',
    'Abraham',
    'David',
    'Genesis 6:14',
    'God instructed Noah to build an ark to save his family and animals from the flood.'
  ),
  (
    (SELECT id FROM categories_dev WHERE name = 'Events'),
    'intermediate',
    'multiple_choice',
    'How many plagues did God send on Egypt?',
    '10',
    '7',
    '10',
    '12',
    '40',
    'Exodus 7-12',
    'The ten plagues were sent to convince Pharaoh to release the Israelites from slavery.'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- HELPER VIEWS FOR ENVIRONMENT COMPARISON
-- ============================================

-- View to compare question counts between environments
CREATE OR REPLACE VIEW question_count_comparison AS
SELECT
  'production' as environment,
  COUNT(*) as question_count,
  COUNT(DISTINCT category_id) as category_count
FROM questions
UNION ALL
SELECT
  'development' as environment,
  COUNT(*) as question_count,
  COUNT(DISTINCT category_id) as category_count
FROM questions_dev;

-- View to compare categories between environments
CREATE OR REPLACE VIEW category_comparison AS
SELECT
  'production' as environment,
  c.name,
  COUNT(q.id) as question_count
FROM categories c
LEFT JOIN questions q ON q.category_id = c.id
GROUP BY c.name
UNION ALL
SELECT
  'development' as environment,
  c.name,
  COUNT(q.id) as question_count
FROM categories_dev c
LEFT JOIN questions_dev q ON q.category_id = c.id
GROUP BY c.name
ORDER BY name, environment;

COMMENT ON TABLE categories_dev IS 'Development version of categories table for testing new content';
COMMENT ON TABLE questions_dev IS 'Development version of questions table for testing new content';
COMMENT ON TABLE game_sessions_dev IS 'Development version of game_sessions for testing gameplay';
COMMENT ON TABLE game_answers_dev IS 'Development version of game_answers for testing';
COMMENT ON TABLE category_stats_dev IS 'Development version of category_stats for testing';
