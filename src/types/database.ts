export type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'scholar';
export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface Question {
  id: string;
  category_id: string;
  difficulty: Difficulty;
  question_type: QuestionType;
  question_text: string;
  correct_answer: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  bible_reference: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  category_id: string;
  difficulty: Difficulty;
  started_at: string;
  completed_at: string | null;
  score: number;
  total_questions: number;
  is_completed: boolean;
}

export interface GameAnswer {
  id: string;
  session_id: string;
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  answered_at: string;
  time_taken_seconds: number | null;
}

export interface UserStats {
  id: string;
  user_id: string;
  total_games_played: number;
  total_questions_answered: number;
  total_correct_answers: number;
  best_streak: number;
  current_streak: number;
  total_points: number;
  last_played_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryStats {
  id: string;
  user_id: string;
  category_id: string;
  games_played: number;
  questions_answered: number;
  correct_answers: number;
  best_score: number;
  average_score: number;
  last_played_at: string | null;
}

export interface DifficultyStats {
  difficulty: Difficulty;
  games_played: number;
  questions_answered: number;
  correct_answers: number;
  accuracy_percentage: number;
}
