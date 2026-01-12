/**
 * Question Admin Service
 * 
 * Service for managing questions in dev environment:
 * - Import questions
 * - Review/approve questions
 * - Delete questions
 * - Update questions
 */

import { supabase } from './supabase';
import { environmentManager } from '../config/environment';
import type { Question, Difficulty, QuestionType } from '../types/database';

export interface QuestionImportData {
  categoryName: string;
  difficulty: Difficulty;
  questionType: QuestionType;
  questionText: string;
  correctAnswer: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  bibleReference?: string | null;
  explanation?: string | null;
  teachingNotes?: string | null;
  tags?: string[] | null;
}

export interface QuestionReview {
  question: Question;
  categoryName: string;
  needsReview: boolean;
}

class QuestionAdminService {
  /**
   * Get all questions in dev environment (for review)
   */
  async getDevQuestions(filters?: {
    categoryId?: string;
    difficulty?: Difficulty;
    isActive?: boolean;
  }): Promise<{
    questions: Question[];
    error: Error | null;
  }> {
    try {
      const tables = environmentManager.getTables();
      let query = supabase
        .from(tables.questions)
        .select('*');

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data: questions, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return { questions: [], error };
      }

      return { questions: questions || [], error: null };
    } catch (err) {
      return { questions: [], error: err as Error };
    }
  }

  /**
   * Get a single question by ID from dev environment
   */
  async getDevQuestionById(questionId: string): Promise<{
    question: Question | null;
    error: Error | null;
  }> {
    try {
      const tables = environmentManager.getTables();
      const { data: question, error } = await supabase
        .from(tables.questions)
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
   * Get questions with category info for review
   */
  async getDevQuestionsForReview(): Promise<{
    questions: QuestionReview[];
    error: Error | null;
  }> {
    try {
      const tables = environmentManager.getTables();
      const { data: questions, error: questionsError } = await supabase
        .from(tables.questions)
        .select(`
          *,
          category:${tables.categories}(name)
        `)
        .order('created_at', { ascending: false });

      if (questionsError) {
        return { questions: [], error: questionsError };
      }

      const reviews: QuestionReview[] = (questions || []).map((q: any) => ({
        question: q,
        categoryName: q.category?.name || 'Unknown',
        needsReview: !q.is_active || q.times_answered === 0,
      }));

      return { questions: reviews, error: null };
    } catch (err) {
      return { questions: [], error: err as Error };
    }
  }

  /**
   * Create a new question in dev environment
   */
  async createDevQuestion(data: QuestionImportData): Promise<{
    question: Question | null;
    error: Error | null;
  }> {
    try {
      const tables = environmentManager.getTables();

      // Get or create category
      const { data: category, error: categoryError } = await supabase
        .from(tables.categories)
        .select('id')
        .eq('name', data.categoryName)
        .single();

      let categoryId: string;

      if (category) {
        categoryId = category.id;
      } else {
        // Create category
        const { data: newCategory, error: createError } = await supabase
          .from(tables.categories)
          .insert({
            name: data.categoryName,
            description: `Questions about ${data.categoryName.toLowerCase()}`,
            sort_order: 0,
          })
          .select('id')
          .single();

        if (createError) {
          return { question: null, error: createError };
        }

        categoryId = newCategory.id;
      }

      // Insert question
      const { data: question, error: insertError } = await supabase
        .from(tables.questions)
        .insert({
          category_id: categoryId,
          difficulty: data.difficulty,
          question_type: data.questionType,
          question_text: data.questionText,
          correct_answer: data.correctAnswer,
          option_a: data.optionA || null,
          option_b: data.optionB || null,
          option_c: data.optionC || null,
          option_d: data.optionD || null,
          bible_reference: data.bibleReference || null,
          explanation: data.explanation || null,
          teaching_notes: data.teachingNotes || null,
          tags: data.tags || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        return { question: null, error: insertError };
      }

      return { question, error: null };
    } catch (err) {
      return { question: null, error: err as Error };
    }
  }

  /**
   * Update a question in dev environment
   */
  async updateDevQuestion(
    questionId: string,
    updates: Partial<QuestionImportData>
  ): Promise<{
    question: Question | null;
    error: Error | null;
  }> {
    try {
      const tables = environmentManager.getTables();

      const updateData: any = {};

      if (updates.difficulty) updateData.difficulty = updates.difficulty;
      if (updates.questionType) updateData.question_type = updates.questionType;
      if (updates.questionText) updateData.question_text = updates.questionText;
      if (updates.correctAnswer) updateData.correct_answer = updates.correctAnswer;
      if (updates.optionA !== undefined) updateData.option_a = updates.optionA;
      if (updates.optionB !== undefined) updateData.option_b = updates.optionB;
      if (updates.optionC !== undefined) updateData.option_c = updates.optionC;
      if (updates.optionD !== undefined) updateData.option_d = updates.optionD;
      if (updates.bibleReference !== undefined) updateData.bible_reference = updates.bibleReference;
      if (updates.explanation !== undefined) updateData.explanation = updates.explanation;
      if (updates.teachingNotes !== undefined) updateData.teaching_notes = updates.teachingNotes;
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      updateData.updated_at = new Date().toISOString();

      const { data: question, error } = await supabase
        .from(tables.questions)
        .update(updateData)
        .eq('id', questionId)
        .select()
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
   * Delete a question from dev environment
   */
  async deleteDevQuestion(questionId: string): Promise<{ error: Error | null }> {
    try {
      const tables = environmentManager.getTables();
      const { error } = await supabase
        .from(tables.questions)
        .delete()
        .eq('id', questionId);

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  }

  /**
   * Toggle question active status
   */
  async toggleQuestionActive(questionId: string): Promise<{
    question: Question | null;
    error: Error | null;
  }> {
    try {
      const tables = environmentManager.getTables();

      // Get current status
      const { data: current, error: fetchError } = await supabase
        .from(tables.questions)
        .select('is_active')
        .eq('id', questionId)
        .single();

      if (fetchError) {
        return { question: null, error: fetchError };
      }

      // Toggle
      const { data: question, error } = await supabase
        .from(tables.questions)
        .update({ is_active: !current.is_active })
        .eq('id', questionId)
        .select()
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
   * Get question statistics for review
   */
  async getQuestionStats(): Promise<{
    stats: {
      total: number;
      active: number;
      inactive: number;
      byDifficulty: Record<Difficulty, number>;
      byCategory: Array<{ categoryName: string; count: number }>;
    };
    error: Error | null;
  }> {
    try {
      const tables = environmentManager.getTables();
      const { data: questions, error } = await supabase
        .from(tables.questions)
        .select(`
          *,
          category:${tables.categories}(name)
        `);

      if (error) {
        return { stats: {} as any, error };
      }

      const stats = {
        total: questions?.length || 0,
        active: questions?.filter((q: any) => q.is_active).length || 0,
        inactive: questions?.filter((q: any) => !q.is_active).length || 0,
        byDifficulty: {
          beginner: 0,
          intermediate: 0,
          expert: 0,
          scholar: 0,
        } as Record<Difficulty, number>,
        byCategory: [] as Array<{ categoryName: string; count: number }>,
      };

      // Count by difficulty
      questions?.forEach((q: any) => {
        if (q.difficulty in stats.byDifficulty) {
          stats.byDifficulty[q.difficulty as Difficulty]++;
        }
      });

      // Count by category
      const categoryMap = new Map<string, number>();
      questions?.forEach((q: any) => {
        const catName = q.category?.name || 'Unknown';
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
      });

      stats.byCategory = Array.from(categoryMap.entries()).map(([name, count]) => ({
        categoryName: name,
        count,
      }));

      return { stats, error: null };
    } catch (err) {
      return { stats: {} as any, error: err as Error };
    }
  }

  /**
   * Get all categories (for dropdown/picker)
   */
  async getCategories(): Promise<{
    categories: any[];
    error: Error | null;
  }> {
    try {
      const tables = environmentManager.getTables();
      const { data: categories, error } = await supabase
        .from(tables.categories)
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
   * Get quality metrics for questions
   */
  async getQualityMetrics(): Promise<{
    metrics: {
      totalQuestions: number;
      questionsWithExplanations: number;
      questionsWithReferences: number;
      questionsWithTeachingNotes: number;
      questionsWithTags: number;
      flaggedForProd: number;
      averageCompleteness: number;
    };
    error: Error | null;
  }> {
    try {
      const tables = environmentManager.getTables();
      const { data: questions, error } = await supabase
        .from(tables.questions)
        .select('*');

      if (error) {
        return { metrics: {} as any, error };
      }

      const total = questions?.length || 0;
      const withExplanations = questions?.filter((q: any) => q.explanation).length || 0;
      const withReferences = questions?.filter((q: any) => q.bible_reference).length || 0;
      const withTeachingNotes = questions?.filter((q: any) => q.teaching_notes).length || 0;
      const withTags = questions?.filter((q: any) => q.tags && q.tags.length > 0).length || 0;
      const flagged = questions?.filter((q: any) => q.ready_for_prod).length || 0;

      // Calculate average completeness (0-100%)
      let totalCompleteness = 0;
      questions?.forEach((q: any) => {
        let completeness = 0;
        if (q.explanation) completeness += 25;
        if (q.bible_reference) completeness += 25;
        if (q.teaching_notes) completeness += 25;
        if (q.tags && q.tags.length > 0) completeness += 25;
        totalCompleteness += completeness;
      });

      const averageCompleteness = total > 0 ? Math.round(totalCompleteness / total) : 0;

      return {
        metrics: {
          totalQuestions: total,
          questionsWithExplanations: withExplanations,
          questionsWithReferences: withReferences,
          questionsWithTeachingNotes: withTeachingNotes,
          questionsWithTags: withTags,
          flaggedForProd: flagged,
          averageCompleteness,
        },
        error: null,
      };
    } catch (err) {
      return { metrics: {} as any, error: err as Error };
    }
  }

  /**
   * Validate question data before creation
   */
  validateQuestionData(data: QuestionImportData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!data.questionText || data.questionText.trim().length === 0) {
      errors.push('Question text is required');
    }

    if (!data.correctAnswer || data.correctAnswer.trim().length === 0) {
      errors.push('Correct answer is required');
    }

    if (!data.categoryName || data.categoryName.trim().length === 0) {
      errors.push('Category is required');
    }

    // Multiple choice validation
    if (data.questionType === 'multiple_choice') {
      const options = [data.optionA, data.optionB, data.optionC, data.optionD].filter(
        (opt) => opt && opt.trim().length > 0
      );

      if (options.length < 2) {
        errors.push('Multiple choice questions require at least 2 options');
      }

      // Check if correct answer matches one of the options
      const correctMatchesOption = options.some(
        (opt) => opt?.trim() === data.correctAnswer.trim()
      );

      if (!correctMatchesOption) {
        errors.push('Correct answer must match one of the provided options');
      }
    }

    // Scholar difficulty should have explanation
    if (data.difficulty === 'scholar' && !data.explanation) {
      errors.push('Scholar difficulty questions should include an explanation');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const questionAdminService = new QuestionAdminService();




