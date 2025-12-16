import { supabase } from './supabase';
import type { UserStats, CategoryStats, DifficultyStats, Difficulty } from '../types/database';
import { environmentManager } from '../config/environment';

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  total_games_played: number;
  rank: number;
}

class UserStatsService {
  /**
   * Get or create user stats
   */
  async getUserStats(userId: string): Promise<{
    stats: UserStats | null;
    error: Error | null;
  }> {
    try {
      // First, try to get existing stats
      const { data: existingStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingStats) {
        return { stats: existingStats, error: null };
      }

      // If not found, create new stats
      if (fetchError && fetchError.code === 'PGRST116') {
        const { data: newStats, error: createError } = await supabase
          .from('user_stats')
          .insert({
            user_id: userId,
            total_games_played: 0,
            total_questions_answered: 0,
            total_correct_answers: 0,
            best_streak: 0,
            current_streak: 0,
            total_points: 0,
            last_played_at: null,
          })
          .select()
          .single();

        if (createError) {
          return { stats: null, error: createError };
        }

        return { stats: newStats, error: null };
      }

      return { stats: null, error: fetchError };
    } catch (err) {
      return { stats: null, error: err as Error };
    }
  }

  /**
   * Update user stats after a game session
   */
  async updateStatsAfterGame(
    userId: string,
    sessionStats: {
      questionsAnswered: number;
      correctAnswers: number;
      points: number;
      newStreak: number;
    }
  ): Promise<{ error: Error | null }> {
    try {
      // Get current stats
      const { stats: currentStats, error: fetchError } = await this.getUserStats(userId);

      if (fetchError || !currentStats) {
        return { error: fetchError || new Error('Failed to fetch user stats') };
      }

      // Calculate new stats
      const newTotalGames = currentStats.total_games_played + 1;
      const newTotalQuestions = currentStats.total_questions_answered + sessionStats.questionsAnswered;
      const newTotalCorrect = currentStats.total_correct_answers + sessionStats.correctAnswers;
      const newTotalPoints = currentStats.total_points + sessionStats.points;
      const newBestStreak = Math.max(currentStats.best_streak, sessionStats.newStreak);

      // Update stats
      const { error: updateError } = await supabase
        .from('user_stats')
        .update({
          total_games_played: newTotalGames,
          total_questions_answered: newTotalQuestions,
          total_correct_answers: newTotalCorrect,
          total_points: newTotalPoints,
          best_streak: newBestStreak,
          current_streak: sessionStats.newStreak,
          last_played_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return { error: updateError };
    } catch (err) {
      return { error: err as Error };
    }
  }

  /**
   * Get category stats for a user
   */
  async getCategoryStats(userId: string, categoryId?: string): Promise<{
    stats: CategoryStats[];
    error: Error | null;
  }> {
    try {
      const tables = environmentManager.getTables();
      let query = supabase
        .from(tables.categoryStats)
        .select('*')
        .eq('user_id', userId);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data: stats, error } = await query.order('games_played', { ascending: false });

      if (error) {
        return { stats: [], error };
      }

      return { stats: stats || [], error: null };
    } catch (err) {
      return { stats: [], error: err as Error };
    }
  }

  /**
   * Update category stats after a game session
   */
  async updateCategoryStats(
    userId: string,
    categoryId: string,
    sessionStats: {
      questionsAnswered: number;
      correctAnswers: number;
      score: number;
    }
  ): Promise<{ error: Error | null }> {
    try {
      const tables = environmentManager.getTables();
      // Try to get existing category stats
      const { data: existingStats, error: fetchError } = await supabase
        .from(tables.categoryStats)
        .select('*')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .single();

      if (existingStats) {
        // Update existing stats
        const newGamesPlayed = existingStats.games_played + 1;
        const newQuestionsAnswered = existingStats.questions_answered + sessionStats.questionsAnswered;
        const newCorrectAnswers = existingStats.correct_answers + sessionStats.correctAnswers;
        const newBestScore = Math.max(existingStats.best_score, sessionStats.score);
        const newAverageScore = ((existingStats.average_score * existingStats.games_played) + sessionStats.score) / newGamesPlayed;

        const { error: updateError } = await supabase
          .from(tables.categoryStats)
          .update({
            games_played: newGamesPlayed,
            questions_answered: newQuestionsAnswered,
            correct_answers: newCorrectAnswers,
            best_score: newBestScore,
            average_score: newAverageScore,
            last_played_at: new Date().toISOString(),
          })
          .eq('id', existingStats.id);

        return { error: updateError };
      } else {
        // Create new stats
        const { error: createError } = await supabase
          .from(tables.categoryStats)
          .insert({
            user_id: userId,
            category_id: categoryId,
            games_played: 1,
            questions_answered: sessionStats.questionsAnswered,
            correct_answers: sessionStats.correctAnswers,
            best_score: sessionStats.score,
            average_score: sessionStats.score,
            last_played_at: new Date().toISOString(),
          });

        return { error: createError };
      }
    } catch (err) {
      return { error: err as Error };
    }
  }

  /**
   * Get difficulty stats for a user
   */
  async getDifficultyStats(userId: string): Promise<{
    stats: DifficultyStats[];
    error: Error | null;
  }> {
    try {
      // This requires aggregating data from game sessions
      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select(`
          difficulty,
          total_questions,
          score
        `)
        .eq('user_id', userId)
        .eq('is_completed', true);

      if (error) {
        return { stats: [], error };
      }

      if (!sessions || sessions.length === 0) {
        return { stats: [], error: null };
      }

      // Aggregate stats by difficulty
      const difficultyMap = new Map<Difficulty, {
        gamesPlayed: number;
        questionsAnswered: number;
        correctAnswers: number;
      }>();

      sessions.forEach((session) => {
        const current = difficultyMap.get(session.difficulty) || {
          gamesPlayed: 0,
          questionsAnswered: 0,
          correctAnswers: 0,
        };

        difficultyMap.set(session.difficulty, {
          gamesPlayed: current.gamesPlayed + 1,
          questionsAnswered: current.questionsAnswered + session.total_questions,
          correctAnswers: current.correctAnswers + session.score,
        });
      });

      // Convert to array
      const stats: DifficultyStats[] = Array.from(difficultyMap.entries()).map(
        ([difficulty, data]) => ({
          difficulty,
          games_played: data.gamesPlayed,
          questions_answered: data.questionsAnswered,
          correct_answers: data.correctAnswers,
          accuracy_percentage: (data.correctAnswers / data.questionsAnswered) * 100,
        })
      );

      return { stats, error: null };
    } catch (err) {
      return { stats: [], error: err as Error };
    }
  }

  /**
   * Get global leaderboard
   */
  async getLeaderboard(limit: number = 10): Promise<{
    leaderboard: LeaderboardEntry[];
    error: Error | null;
  }> {
    try {
      const { data: stats, error } = await supabase
        .from('user_stats')
        .select(`
          user_id,
          total_points,
          total_games_played
        `)
        .order('total_points', { ascending: false })
        .limit(limit);

      if (error) {
        return { leaderboard: [], error };
      }

      if (!stats || stats.length === 0) {
        return { leaderboard: [], error: null };
      }

      // Fetch user profiles for display names
      const userIds = stats.map((s) => s.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      if (profileError) {
        console.error('Failed to fetch profiles:', profileError);
      }

      // Create profile map
      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p.display_name])
      );

      // Build leaderboard entries
      const leaderboard: LeaderboardEntry[] = stats.map((stat, index) => ({
        user_id: stat.user_id,
        display_name: profileMap.get(stat.user_id) || 'Unknown Player',
        total_points: stat.total_points,
        total_games_played: stat.total_games_played,
        rank: index + 1,
      }));

      return { leaderboard, error: null };
    } catch (err) {
      return { leaderboard: [], error: err as Error };
    }
  }

  /**
   * Get user's rank on leaderboard
   */
  async getUserRank(userId: string): Promise<{
    rank: number | null;
    error: Error | null;
  }> {
    try {
      // Get user's total points
      const { stats, error: statsError } = await this.getUserStats(userId);

      if (statsError || !stats) {
        return { rank: null, error: statsError };
      }

      // Count how many users have more points
      const { count, error: countError } = await supabase
        .from('user_stats')
        .select('*', { count: 'exact', head: true })
        .gt('total_points', stats.total_points);

      if (countError) {
        return { rank: null, error: countError };
      }

      const rank = (count || 0) + 1;

      return { rank, error: null };
    } catch (err) {
      return { rank: null, error: err as Error };
    }
  }

  /**
   * Get accuracy percentage for a user
   */
  async getAccuracyPercentage(userId: string): Promise<{
    accuracy: number;
    error: Error | null;
  }> {
    try {
      const { stats, error } = await this.getUserStats(userId);

      if (error || !stats) {
        return { accuracy: 0, error };
      }

      if (stats.total_questions_answered === 0) {
        return { accuracy: 0, error: null };
      }

      const accuracy = (stats.total_correct_answers / stats.total_questions_answered) * 100;

      return { accuracy, error: null };
    } catch (err) {
      return { accuracy: 0, error: err as Error };
    }
  }

  /**
   * Reset user stats (useful for testing or user request)
   */
  async resetUserStats(userId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('user_stats')
        .update({
          total_games_played: 0,
          total_questions_answered: 0,
          total_correct_answers: 0,
          best_streak: 0,
          current_streak: 0,
          total_points: 0,
          last_played_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  }
}

// Export a singleton instance
export const userStatsService = new UserStatsService();
