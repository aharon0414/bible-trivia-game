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
