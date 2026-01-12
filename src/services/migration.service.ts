/**
 * Migration Service
 * Utilities to copy approved content from dev tables to production tables
 */

import { supabase } from './supabase';
import { environmentManager } from '../config/environment';

// Helper function to check authentication status
async function checkAuthStatus() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error, isAuthenticated: !!user };
}

export interface MigrationResult {
  success: boolean;
  message: string;
  itemsMigrated?: number;
  error?: Error | null;
}

class MigrationService {
  /**
   * Flag a question as ready for production migration
   */
  async flagQuestionForMigration(questionId: string): Promise<MigrationResult> {
    try {
      const { error } = await supabase
        .from('questions_dev')
        .update({ ready_for_prod: true })
        .eq('id', questionId);

      if (error) {
        return {
          success: false,
          message: `Failed to flag question: ${error.message}`,
          error,
        };
      }

      return {
        success: true,
        message: 'Question flagged for migration to production',
        itemsMigrated: 0, // Not migrated yet, just flagged
      };
    } catch (err) {
      return {
        success: false,
        message: `Unexpected error: ${(err as Error).message}`,
        error: err as Error,
      };
    }
  }

  /**
   * Unflag a question (remove from migration queue)
   */
  async unflagQuestion(questionId: string): Promise<MigrationResult> {
    try {
      const { error } = await supabase
        .from('questions_dev')
        .update({ ready_for_prod: false })
        .eq('id', questionId);

      if (error) {
        return {
          success: false,
          message: `Failed to unflag question: ${error.message}`,
          error,
        };
      }

      return {
        success: true,
        message: 'Question unflagged',
        itemsMigrated: 0,
      };
    } catch (err) {
      return {
        success: false,
        message: `Unexpected error: ${(err as Error).message}`,
        error: err as Error,
      };
    }
  }

  /**
   * Get all questions flagged for migration
   */
  async getFlaggedQuestions(): Promise<{
    questions: any[];
    error: Error | null;
  }> {
    try {
      console.log('[MigrationService] getFlaggedQuestions: Querying questions_dev for ready_for_prod=true');
      const { data: questions, error } = await supabase
        .from('questions_dev')
        .select(`
          *,
          category:categories_dev(name)
        `)
        .eq('ready_for_prod', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MigrationService] getFlaggedQuestions error:', error);
        return { questions: [], error };
      }

      console.log('[MigrationService] getFlaggedQuestions: Found', questions?.length || 0, 'flagged questions');
      return { questions: questions || [], error: null };
    } catch (err) {
      console.error('[MigrationService] getFlaggedQuestions exception:', err);
      return { questions: [], error: err as Error };
    }
  }

  /**
   * Migrate a question from dev to production
   * Maps dev category_id to production category_id by name
   */
  async migrateQuestion(questionId: string): Promise<MigrationResult> {
    console.log(`[MigrationService] migrateQuestion called for questionId: ${questionId}`);
    try {
      // Get question from dev table with category info
      console.log(`[MigrationService] Fetching question ${questionId} from questions_dev...`);
      const { data: devQuestion, error: fetchError } = await supabase
        .from('questions_dev')
        .select(`
          *,
          category:categories_dev(name)
        `)
        .eq('id', questionId)
        .single();

      if (fetchError || !devQuestion) {
        console.error(`[MigrationService] Failed to fetch question ${questionId}:`, fetchError);
        return {
          success: false,
          message: `Question not found in dev: ${fetchError?.message || 'Unknown error'}`,
          error: fetchError,
        };
      }

      console.log(`[MigrationService] Question fetched from dev:`, {
        id: devQuestion.id,
        question_text: devQuestion.question_text.substring(0, 50),
        category: devQuestion.category,
      });

      // Find corresponding category in production by name
      const category = devQuestion.category;
      if (!category || !category.name) {
        console.error(`[MigrationService] Question ${questionId} has no category or category name`);
        return {
          success: false,
          message: 'Question category not found',
          error: null,
        };
      }

      console.log(`[MigrationService] Looking for category "${category.name}" in production categories...`);
      const { data: prodCategory, error: categoryError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('name', category.name)
        .single();

      if (categoryError || !prodCategory) {
        console.error(`[MigrationService] Category "${category.name}" not found in production:`, categoryError);
        return {
          success: false,
          message: `Category "${category.name}" not found in production. Please migrate the category first.`,
          error: categoryError,
        };
      }

      console.log(`[MigrationService] Found production category:`, { id: prodCategory.id, name: prodCategory.name });

      // Check if question with same text already exists in prod
      console.log(`[MigrationService] Checking for duplicate question in production...`);
      const { data: existingQuestion, error: duplicateCheckError } = await supabase
        .from('questions')
        .select('id')
        .eq('question_text', devQuestion.question_text)
        .single();

      if (duplicateCheckError && duplicateCheckError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is expected - not an error
        console.error(`[MigrationService] Error checking for duplicates:`, duplicateCheckError);
      }

      if (existingQuestion) {
        console.log(`[MigrationService] Question already exists in production (ID: ${existingQuestion.id})`);
        return {
          success: false,
          message: 'Question with this text already exists in production',
          error: null,
        };
      }

      // Check authentication status before insert
      console.log(`[MigrationService] Checking authentication status...`);
      const authStatus = await checkAuthStatus();
      console.log(`[MigrationService] Auth status:`, {
        isAuthenticated: authStatus.isAuthenticated,
        userId: authStatus.user?.id,
        error: authStatus.error?.message,
      });

      // Insert into production
      console.log(`[MigrationService] Inserting question into production questions table...`);
      const insertData = {
        category_id: prodCategory.id,
        difficulty: devQuestion.difficulty,
        question_type: devQuestion.question_type,
        question_text: devQuestion.question_text,
        correct_answer: devQuestion.correct_answer,
        option_a: devQuestion.option_a,
        option_b: devQuestion.option_b,
        option_c: devQuestion.option_c,
        option_d: devQuestion.option_d,
        bible_reference: devQuestion.bible_reference,
        explanation: devQuestion.explanation || null,
        is_active: devQuestion.is_active ?? true,
      };
      console.log(`[MigrationService] Insert data:`, JSON.stringify(insertData, null, 2));

      const { data: prodQuestion, error: insertError } = await supabase
        .from('questions')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error(`[MigrationService] Failed to insert question into production:`, insertError);
        console.error(`[MigrationService] Insert error details:`, {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
        return {
          success: false,
          message: `Failed to migrate question: ${insertError.message}`,
          error: insertError,
        };
      }

      console.log(`[MigrationService] Question inserted successfully into production (ID: ${prodQuestion?.id})`);

      // Unflag the question after successful migration
      console.log(`[MigrationService] Unflagging question ${questionId} in dev...`);
      const { error: unflagError } = await supabase
        .from('questions_dev')
        .update({ ready_for_prod: false })
        .eq('id', questionId);

      if (unflagError) {
        console.warn(`[MigrationService] Warning: Failed to unflag question ${questionId}:`, unflagError);
        // Don't fail the migration if unflagging fails - question is already in prod
      } else {
        console.log(`[MigrationService] Question ${questionId} unflagged successfully`);
      }

      return {
        success: true,
        message: 'Question migrated successfully',
        itemsMigrated: 1,
      };
    } catch (err) {
      console.error(`[MigrationService] Exception in migrateQuestion:`, err);
      return {
        success: false,
        message: `Unexpected error: ${(err as Error).message}`,
        error: err as Error,
      };
    }
  }

  /**
   * Batch migrate all flagged questions to production
   */
  async batchMigrateFlaggedQuestions(): Promise<MigrationResult> {
    console.log('[MigrationService] batchMigrateFlaggedQuestions called');
    try {
      // Get all flagged questions
      console.log('[MigrationService] Fetching flagged questions...');
      const { questions, error: fetchError } = await this.getFlaggedQuestions();
      console.log('[MigrationService] Flagged questions fetched:', questions?.length || 0, 'questions');

      if (fetchError) {
        console.error('[MigrationService] Error fetching flagged questions:', fetchError);
        return {
          success: false,
          message: `Failed to fetch flagged questions: ${fetchError.message}`,
          error: fetchError,
        };
      }

      if (!questions || questions.length === 0) {
        console.log('[MigrationService] No flagged questions found');
        return {
          success: true,
          message: 'No questions flagged for migration',
          itemsMigrated: 0,
        };
      }

      console.log('[MigrationService] Starting migration of', questions.length, 'questions');
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Migrate each flagged question
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(`[MigrationService] Migrating question ${i + 1}/${questions.length} (ID: ${question.id}): ${question.question_text.substring(0, 50)}...`);
        
        const result = await this.migrateQuestion(question.id);
        console.log(`[MigrationService] Question ${i + 1} migration result:`, result.success ? 'SUCCESS' : 'FAILED', result.message);
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          const errorMsg = `${question.question_text.substring(0, 30)}...: ${result.message}`;
          errors.push(errorMsg);
          console.error(`[MigrationService] Question ${i + 1} failed:`, errorMsg);
          if (result.error) {
            console.error('[MigrationService] Error details:', result.error);
          }
        }
      }

      const finalResult = {
        success: errorCount === 0,
        message: `Migrated ${successCount} question(s). ${errorCount} failed.`,
        itemsMigrated: successCount,
        error: errorCount > 0 ? new Error(errors.join('; ')) : null,
      };
      
      console.log('[MigrationService] Batch migration complete:', finalResult);
      return finalResult;
    } catch (err) {
      console.error('[MigrationService] Exception in batchMigrateFlaggedQuestions:', err);
      return {
        success: false,
        message: `Unexpected error: ${(err as Error).message}`,
        error: err as Error,
      };
    }
  }

  /**
   * Migrate a category from dev to production
   */
  async migrateCategory(categoryId: string): Promise<MigrationResult> {
    try {
      const { data: devCategory, error: fetchError } = await supabase
        .from('categories_dev')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (fetchError || !devCategory) {
        return {
          success: false,
          message: `Category not found in dev: ${fetchError?.message || 'Unknown error'}`,
          error: fetchError,
        };
      }

      // Check if category with same name already exists in prod
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', devCategory.name)
        .single();

      if (existingCategory) {
        return {
          success: false,
          message: `Category "${devCategory.name}" already exists in production`,
          error: null,
        };
      }

      // Insert into production
      const { data: prodCategory, error: insertError } = await supabase
        .from('categories')
        .insert({
          name: devCategory.name,
          description: devCategory.description,
          sort_order: devCategory.sort_order,
        })
        .select()
        .single();

      if (insertError) {
        return {
          success: false,
          message: `Failed to migrate category: ${insertError.message}`,
          error: insertError,
        };
      }

      return {
        success: true,
        message: `Category "${devCategory.name}" migrated successfully`,
        itemsMigrated: 1,
      };
    } catch (err) {
      return {
        success: false,
        message: `Unexpected error: ${(err as Error).message}`,
        error: err as Error,
      };
    }
  }

  /**
   * Validate production readiness for a question
   * Returns validation results with warnings and errors
   */
  async validateQuestionForProduction(questionId: string): Promise<{
    isReady: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const { data: question, error } = await supabase
        .from('questions_dev')
        .select(`
          *,
          category:categories_dev(name)
        `)
        .eq('id', questionId)
        .single();

      if (error || !question) {
        return {
          isReady: false,
          errors: ['Question not found in dev environment'],
          warnings: [],
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Critical validations (errors)
      if (!question.question_text || question.question_text.trim().length === 0) {
        errors.push('Question text is empty');
      }

      if (!question.correct_answer || question.correct_answer.trim().length === 0) {
        errors.push('Correct answer is missing');
      }

      if (!question.category) {
        errors.push('Category not found in dev');
      } else {
        // Check if category exists in production
        const { data: prodCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('name', question.category.name)
          .single();

        if (!prodCategory) {
          errors.push(`Category "${question.category.name}" does not exist in production. Migrate category first.`);
        }
      }

      // Check for duplicate in production
      const { data: existingQuestion } = await supabase
        .from('questions')
        .select('id')
        .eq('question_text', question.question_text)
        .single();

      if (existingQuestion) {
        errors.push('Question with identical text already exists in production');
      }

      // Multiple choice validation
      if (question.question_type === 'multiple_choice') {
        const options = [
          question.option_a,
          question.option_b,
          question.option_c,
          question.option_d,
        ].filter((opt) => opt && opt.trim().length > 0);

        if (options.length < 2) {
          errors.push('Multiple choice questions require at least 2 options');
        }

        const correctMatchesOption = options.some(
          (opt) => opt?.trim() === question.correct_answer.trim()
        );

        if (!correctMatchesOption) {
          errors.push('Correct answer does not match any of the provided options');
        }
      }

      // Quality warnings (not blocking, but should be addressed)
      if (!question.explanation) {
        warnings.push('Missing explanation - users benefit from understanding why the answer is correct');
      }

      if (!question.bible_reference) {
        warnings.push('Missing Bible reference - helps users learn Scripture locations');
      }

      if (!question.teaching_notes && question.difficulty === 'scholar') {
        warnings.push('Scholar difficulty questions should include teaching notes for deeper learning');
      }

      if (!question.tags || question.tags.length === 0) {
        warnings.push('No tags - tagging helps with categorization and search');
      }

      if (question.question_text.length < 10) {
        warnings.push('Question text seems very short - ensure it provides clear context');
      }

      if (question.question_text.length > 500) {
        warnings.push('Question text is quite long - consider breaking it down for clarity');
      }

      return {
        isReady: errors.length === 0,
        errors,
        warnings,
      };
    } catch (err) {
      return {
        isReady: false,
        errors: [`Validation error: ${(err as Error).message}`],
        warnings: [],
      };
    }
  }

  /**
   * Get migration readiness summary for all flagged questions
   */
  async getMigrationReadinessSummary(): Promise<{
    summary: {
      totalFlagged: number;
      readyToMigrate: number;
      hasErrors: number;
      hasWarningsOnly: number;
      errorDetails: Array<{ questionId: string; questionText: string; errors: string[] }>;
    };
    error: Error | null;
  }> {
    try {
      const { questions, error: fetchError } = await this.getFlaggedQuestions();

      if (fetchError) {
        return { summary: {} as any, error: fetchError };
      }

      const summary = {
        totalFlagged: questions.length,
        readyToMigrate: 0,
        hasErrors: 0,
        hasWarningsOnly: 0,
        errorDetails: [] as Array<{ questionId: string; questionText: string; errors: string[] }>,
      };

      for (const question of questions) {
        const validation = await this.validateQuestionForProduction(question.id);

        if (validation.isReady) {
          if (validation.warnings.length > 0) {
            summary.hasWarningsOnly++;
          }
          summary.readyToMigrate++;
        } else {
          summary.hasErrors++;
          summary.errorDetails.push({
            questionId: question.id,
            questionText: question.question_text,
            errors: validation.errors,
          });
        }
      }

      return { summary, error: null };
    } catch (err) {
      return { summary: {} as any, error: err as Error };
    }
  }

  /**
   * Batch validate all flagged questions before migration
   * Returns a detailed report
   */
  async validateAllFlaggedQuestions(): Promise<{
    validationReport: Array<{
      questionId: string;
      questionText: string;
      isReady: boolean;
      errors: string[];
      warnings: string[];
    }>;
    error: Error | null;
  }> {
    try {
      const { questions, error: fetchError } = await this.getFlaggedQuestions();

      if (fetchError) {
        return { validationReport: [], error: fetchError };
      }

      const validationReport = [];

      for (const question of questions) {
        const validation = await this.validateQuestionForProduction(question.id);
        validationReport.push({
          questionId: question.id,
          questionText: question.question_text,
          isReady: validation.isReady,
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      return { validationReport, error: null };
    } catch (err) {
      return { validationReport: [], error: err as Error };
    }
  }
}

// Export a singleton instance
export const migrationService = new MigrationService();




