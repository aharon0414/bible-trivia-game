-- Bible Trivia Game Database Schema
-- Run this script in your Supabase SQL Editor to create all necessary tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert', 'scholar')),
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank')),
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  bible_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert', 'scholar')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Game answers table
CREATE TABLE IF NOT EXISTS game_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_taken_seconds INTEGER
);

-- User statistics table
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  total_games_played INTEGER NOT NULL DEFAULT 0,
  total_questions_answered INTEGER NOT NULL DEFAULT 0,
  total_correct_answers INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Category statistics table
CREATE TABLE IF NOT EXISTS category_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  games_played INTEGER NOT NULL DEFAULT 0,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  average_score DECIMAL NOT NULL DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, category_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_completed ON game_sessions(is_completed);
CREATE INDEX IF NOT EXISTS idx_game_answers_session ON game_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_category_stats_user ON category_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_points ON user_stats(total_points DESC);

-- Create a function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample categories
INSERT INTO categories (name, description, sort_order) VALUES
  ('Old Testament', 'Questions about the Old Testament books and stories', 1),
  ('New Testament', 'Questions about the New Testament books and stories', 2),
  ('Life of Jesus', 'Questions specifically about Jesus Christ', 3),
  ('Apostles', 'Questions about the twelve apostles and early church', 4),
  ('Prophets', 'Questions about biblical prophets and their messages', 5),
  ('Miracles', 'Questions about miracles in the Bible', 6),
  ('Parables', 'Questions about parables taught by Jesus', 7),
  ('Geography', 'Questions about biblical places and locations', 8),
  ('People', 'Questions about important biblical figures', 9),
  ('Books of the Bible', 'Questions about the structure and content of biblical books', 10)
ON CONFLICT DO NOTHING;

-- Insert sample questions (Old Testament - Beginner)
INSERT INTO questions (category_id, difficulty, question_type, question_text, correct_answer, option_a, option_b, option_c, option_d, bible_reference) VALUES
  (
    (SELECT id FROM categories WHERE name = 'Old Testament'),
    'beginner',
    'multiple_choice',
    'Who built the ark?',
    'Noah',
    'Noah',
    'Moses',
    'Abraham',
    'David',
    'Genesis 6:14'
  ),
  (
    (SELECT id FROM categories WHERE name = 'Old Testament'),
    'beginner',
    'multiple_choice',
    'Who was swallowed by a great fish?',
    'Jonah',
    'Daniel',
    'Jonah',
    'Elijah',
    'Isaiah',
    'Jonah 1:17'
  ),
  (
    (SELECT id FROM categories WHERE name = 'Old Testament'),
    'intermediate',
    'multiple_choice',
    'How many plagues did God send on Egypt?',
    '10',
    '7',
    '10',
    '12',
    '40',
    'Exodus 7-12'
  ),
  (
    (SELECT id FROM categories WHERE name = 'Life of Jesus'),
    'beginner',
    'multiple_choice',
    'In which town was Jesus born?',
    'Bethlehem',
    'Nazareth',
    'Jerusalem',
    'Bethlehem',
    'Capernaum',
    'Luke 2:4-7'
  ),
  (
    (SELECT id FROM categories WHERE name = 'Life of Jesus'),
    'beginner',
    'true_false',
    'Jesus had twelve disciples.',
    'True',
    'True',
    'False',
    NULL,
    NULL,
    'Matthew 10:1-4'
  );

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_stats ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles but only update their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Game Sessions: Users can only see and modify their own sessions
CREATE POLICY "Users can view own game sessions"
  ON game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own game sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game sessions"
  ON game_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own game sessions"
  ON game_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Game Answers: Users can only see and modify answers for their sessions
CREATE POLICY "Users can view answers for own sessions"
  ON game_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE game_sessions.id = game_answers.session_id
      AND game_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create answers for own sessions"
  ON game_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE game_sessions.id = game_answers.session_id
      AND game_sessions.user_id = auth.uid()
    )
  );

-- User Stats: Users can view all stats but only modify their own
CREATE POLICY "User stats are viewable by everyone"
  ON user_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Category Stats: Users can view all stats but only modify their own
CREATE POLICY "Category stats are viewable by everyone"
  ON category_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own category stats"
  ON category_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category stats"
  ON category_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Categories and Questions are readable by everyone
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Questions are viewable by everyone"
  ON questions FOR SELECT
  USING (true);
