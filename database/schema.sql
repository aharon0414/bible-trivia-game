-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_name VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions  
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id),
    difficulty VARCHAR(20) NOT NULL,
    question_type VARCHAR(20) NOT NULL,
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    option_a TEXT,
    option_b TEXT, 
    option_c TEXT,
    option_d TEXT,
    bible_reference VARCHAR(200),
    explanation TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    times_answered INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('beginner', 'intermediate', 'expert', 'scholar')),
    CONSTRAINT valid_question_type CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank'))
);
