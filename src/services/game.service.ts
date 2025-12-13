import { supabase } from './supabase';
import type { GameSession, GameAnswer, Difficulty } from '../types/database';

export interface CreateGameSessionData {
  userId: string;
  categoryId: string;
  difficulty: Difficulty;
  totalQuestions: number;
}

export interface SubmitAnswerData {
  sessionId: string;
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeTakenSeconds?: number;
}

export interface GameSessionWithAnswers extends GameSession {
  answers: GameAnswer[];
}

class GameService {
  /**
   * Create a new game session
   */
  async createSession(data: CreateGameSessionData): Promise<{
    session: GameSession | null;
    error: Error | null;
  }> {
    try {
      const { data: session, error } = await supabase
        .from('game_sessions')
        .insert({
          user_id: data.userId,
          category_id: data.categoryId,
          difficulty: data.difficulty,
          total_questions: data.totalQuestions,
          score: 0,
          is_completed: false,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { session: null, error };
      }

      return { session, error: null };
    } catch (err) {
      return { session: null, error: err as Error };
    }
  }

  /**
   * Submit an answer for a game session
   */
  async submitAnswer(data: SubmitAnswerData): Promise<{
    answer: GameAnswer | null;
    error: Error | null;
  }> {
    try {
      // Insert the answer
      const { data: answer, error: answerError } = await supabase
        .from('game_answers')
        .insert({
          session_id: data.sessionId,
          question_id: data.questionId,
          user_answer: data.userAnswer,
          is_correct: data.isCorrect,
          time_taken_seconds: data.timeTakenSeconds,
          answered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (answerError) {
        return { answer: null, error: answerError };
      }

      // Update session score if answer is correct
      if (data.isCorrect) {
        const { error: updateError } = await supabase
          .from('game_sessions')
          .update({
            score: supabase.rpc('increment', { row_id: data.sessionId }),
          })
          .eq('id', data.sessionId);

        if (updateError) {
          console.error('Failed to update session score:', updateError);
        }
      }

      return { answer, error: null };
    } catch (err) {
      return { answer: null, error: err as Error };
    }
  }

  /**
   * Complete a game session
   */
  async completeSession(sessionId: string): Promise<{
    session: GameSession | null;
    error: Error | null;
  }> {
    try {
      const { data: session, error } = await supabase
        .from('game_sessions')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        return { session: null, error };
      }

      return { session, error: null };
    } catch (err) {
      return { session: null, error: err as Error };
    }
  }

  /**
   * Get a specific game session
   */
  async getSession(sessionId: string): Promise<{
    session: GameSession | null;
    error: Error | null;
  }> {
    try {
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        return { session: null, error };
      }

      return { session, error: null };
    } catch (err) {
      return { session: null, error: err as Error };
    }
  }

  /**
   * Get game session with all answers
   */
  async getSessionWithAnswers(sessionId: string): Promise<{
    session: GameSessionWithAnswers | null;
    error: Error | null;
  }> {
    try {
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return { session: null, error: sessionError };
      }

      const { data: answers, error: answersError } = await supabase
        .from('game_answers')
        .select('*')
        .eq('session_id', sessionId)
        .order('answered_at', { ascending: true });

      if (answersError) {
        return { session: null, error: answersError };
      }

      return {
        session: {
          ...session,
          answers: answers || [],
        },
        error: null,
      };
    } catch (err) {
      return { session: null, error: err as Error };
    }
  }

  /**
   * Get all game sessions for a user
   */
  async getUserSessions(userId: string, limit: number = 20): Promise<{
    sessions: GameSession[];
    error: Error | null;
  }> {
    try {
      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { sessions: [], error };
      }

      return { sessions: sessions || [], error: null };
    } catch (err) {
      return { sessions: [], error: err as Error };
    }
  }

  /**
   * Get user's active (incomplete) session
   */
  async getActiveSession(userId: string): Promise<{
    session: GameSession | null;
    error: Error | null;
  }> {
    try {
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" - which is ok, means no active session
        return { session: null, error };
      }

      return { session: session || null, error: null };
    } catch (err) {
      return { session: null, error: err as Error };
    }
  }

  /**
   * Get answers for a specific session
   */
  async getSessionAnswers(sessionId: string): Promise<{
    answers: GameAnswer[];
    error: Error | null;
  }> {
    try {
      const { data: answers, error } = await supabase
        .from('game_answers')
        .select('*')
        .eq('session_id', sessionId)
        .order('answered_at', { ascending: true });

      if (error) {
        return { answers: [], error };
      }

      return { answers: answers || [], error: null };
    } catch (err) {
      return { answers: [], error: err as Error };
    }
  }

  /**
   * Delete a game session (and its answers via cascade)
   */
  async deleteSession(sessionId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', sessionId);

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<{
    stats: {
      totalAnswered: number;
      correctAnswers: number;
      incorrectAnswers: number;
      accuracyPercentage: number;
      averageTimePerQuestion: number | null;
    } | null;
    error: Error | null;
  }> {
    try {
      const { answers, error } = await this.getSessionAnswers(sessionId);

      if (error || !answers.length) {
        return { stats: null, error };
      }

      const totalAnswered = answers.length;
      const correctAnswers = answers.filter((a) => a.is_correct).length;
      const incorrectAnswers = totalAnswered - correctAnswers;
      const accuracyPercentage = (correctAnswers / totalAnswered) * 100;

      const answersWithTime = answers.filter((a) => a.time_taken_seconds !== null);
      const averageTimePerQuestion = answersWithTime.length > 0
        ? answersWithTime.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0) / answersWithTime.length
        : null;

      return {
        stats: {
          totalAnswered,
          correctAnswers,
          incorrectAnswers,
          accuracyPercentage,
          averageTimePerQuestion,
        },
        error: null,
      };
    } catch (err) {
      return { stats: null, error: err as Error };
    }
  }
}

// Export a singleton instance
export const gameService = new GameService();
