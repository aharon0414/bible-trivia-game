import { supabase } from './supabase';
import type { Question, Category, Difficulty, QuestionType } from '../types/database';

export interface QuestionFilters {
  categoryId?: string;
  difficulty?: Difficulty;
  questionType?: QuestionType;
  excludeIds?: string[];
}

export interface QuestionWithCategory extends Question {
  category: Category;
}

class QuestionService {
  /**
   * Get all categories
   */
  async getCategories(): Promise<{
    categories: Category[];
    error: Error | null;
  }> {
    try {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        return { categories: [], error };
      }

      return { categories: categories || [], error: null };
    } catch (err) {
      return { categories: [], error: err as Error };
    }
  }

  /**
   * Get a specific category by ID
   */
  async getCategory(categoryId: string): Promise<{
    category: Category | null;
    error: Error | null;
  }> {
    try {
      const { data: category, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) {
        return { category: null, error };
      }

      return { category, error: null };
    } catch (err) {
      return { category: null, error: err as Error };
    }
  }

  /**
   * Get random questions based on filters
   */
  async getRandomQuestions(
    count: number,
    filters: QuestionFilters = {}
  ): Promise<{
    questions: Question[];
    error: Error | null;
  }> {
    try {
      let query = supabase
        .from('questions')
        .select('*');

      // Apply filters
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters.questionType) {
        query = query.eq('question_type', filters.questionType);
      }

      if (filters.excludeIds && filters.excludeIds.length > 0) {
        query = query.not('id', 'in', `(${filters.excludeIds.join(',')})`);
      }

      // Fetch more than needed to randomize
      const { data: questions, error } = await query.limit(count * 3);

      if (error) {
        return { questions: [], error };
      }

      if (!questions || questions.length === 0) {
        return { questions: [], error: null };
      }

      // Randomize and limit to requested count
      const shuffled = questions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(count, shuffled.length));

      return { questions: selected, error: null };
    } catch (err) {
      return { questions: [], error: err as Error };
    }
  }

  /**
   * Get a specific question by ID
   */
  async getQuestion(questionId: string): Promise<{
    question: Question | null;
    error: Error | null;
  }> {
    try {
      const { data: question, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (error) {
        return { question: null, error };
      }

      return { question, error: null };
    } catch (err) {
      return { question: null, error: err as Error };
    }
  }

  /**
   * Get question with category information
   */
  async getQuestionWithCategory(questionId: string): Promise<{
    question: QuestionWithCategory | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('id', questionId)
        .single();

      if (error) {
        return { question: null, error };
      }

      return { question: data as QuestionWithCategory, error: null };
    } catch (err) {
      return { question: null, error: err as Error };
    }
  }

  /**
   * Get questions with category information
   */
  async getQuestionsWithCategory(filters: QuestionFilters = {}): Promise<{
    questions: QuestionWithCategory[];
    error: Error | null;
  }> {
    try {
      let query = supabase
        .from('questions')
        .select(`
          *,
          category:categories(*)
        `);

      // Apply filters
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters.questionType) {
        query = query.eq('question_type', filters.questionType);
      }

      const { data: questions, error } = await query;

      if (error) {
        return { questions: [], error };
      }

      return { questions: questions as QuestionWithCategory[] || [], error: null };
    } catch (err) {
      return { questions: [], error: err as Error };
    }
  }

  /**
   * Get question count by filters
   */
  async getQuestionCount(filters: QuestionFilters = {}): Promise<{
    count: number;
    error: Error | null;
  }> {
    try {
      let query = supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      // Apply filters
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters.questionType) {
        query = query.eq('question_type', filters.questionType);
      }

      const { count, error } = await query;

      if (error) {
        return { count: 0, error };
      }

      return { count: count || 0, error: null };
    } catch (err) {
      return { count: 0, error: err as Error };
    }
  }

  /**
   * Validate an answer
   */
  validateAnswer(question: Question, userAnswer: string): boolean {
    return question.correct_answer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
  }

  /**
   * Get question options (for multiple choice questions)
   */
  getQuestionOptions(question: Question): string[] {
    const options: string[] = [];

    if (question.option_a) options.push(question.option_a);
    if (question.option_b) options.push(question.option_b);
    if (question.option_c) options.push(question.option_c);
    if (question.option_d) options.push(question.option_d);

    return options;
  }

  /**
   * Get questions by category
   */
  async getQuestionsByCategory(
    categoryId: string,
    limit: number = 10
  ): Promise<{
    questions: Question[];
    error: Error | null;
  }> {
    try {
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('category_id', categoryId)
        .limit(limit);

      if (error) {
        return { questions: [], error };
      }

      return { questions: questions || [], error: null };
    } catch (err) {
      return { questions: [], error: err as Error };
    }
  }

  /**
   * Get questions by difficulty
   */
  async getQuestionsByDifficulty(
    difficulty: Difficulty,
    limit: number = 10
  ): Promise<{
    questions: Question[];
    error: Error | null;
  }> {
    try {
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('difficulty', difficulty)
        .limit(limit);

      if (error) {
        return { questions: [], error };
      }

      return { questions: questions || [], error: null };
    } catch (err) {
      return { questions: [], error: err as Error };
    }
  }

  /**
   * Search questions by text
   */
  async searchQuestions(searchTerm: string): Promise<{
    questions: Question[];
    error: Error | null;
  }> {
    try {
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .textSearch('question_text', searchTerm);

      if (error) {
        return { questions: [], error };
      }

      return { questions: questions || [], error: null };
    } catch (err) {
      return { questions: [], error: err as Error };
    }
  }
}

// Export a singleton instance
export const questionService = new QuestionService();
