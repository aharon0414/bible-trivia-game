/**
 * Leaderboard Service
 *
 * Service for managing leaderboard data:
 * - Get global leaderboards (all-time, weekly, monthly)
 * - Get category-specific leaderboards
 * - Get user's rank and position
 * - Manage user privacy settings
 */

import { supabase } from './supabase';

export type LeaderboardPeriod = 'alltime' | 'weekly' | 'monthly';

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  email: string;
  games_played: number;
  total_correct: number;
  total_questions: number;
  accuracy_percentage: number;
  rank: number;
  best_streak?: number;
  best_score?: number;
}

export interface UserRank {
  user_rank: number | null;
  total_players: number;
  user_score: number | null;
  top_score: number;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  show_on_leaderboard: boolean;
}

class LeaderboardService {
  /**
   * Get global leaderboard
   */
  async getGlobalLeaderboard(
    period: LeaderboardPeriod = 'alltime',
    limit: number = 100
  ): Promise<{
    entries: LeaderboardEntry[];
    error: Error | null;
  }> {
    try {
      let viewName = '';

      switch (period) {
        case 'weekly':
          viewName = 'leaderboard_global_weekly';
          break;
        case 'monthly':
          viewName = 'leaderboard_global_monthly';
          break;
        default:
          viewName = 'leaderboard_global_alltime';
      }

      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .limit(limit);

      if (error) {
        return { entries: [], error };
      }

      return { entries: data || [], error: null };
    } catch (err) {
      return { entries: [], error: err as Error };
    }
  }

  /**
   * Get category-specific leaderboard
   */
  async getCategoryLeaderboard(
    categoryId: string,
    period: LeaderboardPeriod = 'alltime',
    limit: number = 100
  ): Promise<{
    entries: LeaderboardEntry[];
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_category_leaderboard', {
          p_category_id: categoryId,
          p_period: period,
          p_limit: limit
        });

      if (error) {
        return { entries: [], error };
      }

      return { entries: data || [], error: null };
    } catch (err) {
      return { entries: [], error: err as Error };
    }
  }

  /**
   * Get user's rank and position
   */
  async getUserRank(
    userId: string,
    period: LeaderboardPeriod = 'alltime',
    categoryId?: string
  ): Promise<{
    rank: UserRank | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_rank', {
          p_user_id: userId,
          p_period: period,
          p_category_id: categoryId || null
        });

      if (error) {
        return { rank: null, error };
      }

      // RPC returns an array with one item
      const rankData = data && data.length > 0 ? data[0] : null;

      return { rank: rankData, error: null };
    } catch (err) {
      return { rank: null, error: err as Error };
    }
  }

  /**
   * Get user profile settings
   */
  async getUserProfile(userId: string): Promise<{
    profile: UserProfile | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, show_on_leaderboard')
        .eq('id', userId)
        .single();

      if (error) {
        return { profile: null, error };
      }

      return { profile: data, error: null };
    } catch (err) {
      return { profile: null, error: err as Error };
    }
  }

  /**
   * Update user's display name
   */
  async updateDisplayName(
    userId: string,
    displayName: string
  ): Promise<{
    success: boolean;
    error: Error | null;
  }> {
    try {
      // Validate display name
      if (!displayName || displayName.trim().length === 0) {
        return {
          success: false,
          error: new Error('Display name cannot be empty')
        };
      }

      if (displayName.length > 50) {
        return {
          success: false,
          error: new Error('Display name must be 50 characters or less')
        };
      }

      const { error } = await supabase
        .rpc('update_display_name', {
          p_user_id: userId,
          p_display_name: displayName.trim()
        });

      if (error) {
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  }

  /**
   * Toggle leaderboard visibility
   */
  async toggleLeaderboardVisibility(
    userId: string,
    showOnLeaderboard: boolean
  ): Promise<{
    success: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await supabase
        .rpc('toggle_leaderboard_visibility', {
          p_user_id: userId,
          p_show: showOnLeaderboard
        });

      if (error) {
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  }

  /**
   * Get top performers summary
   */
  async getTopPerformers(
    period: LeaderboardPeriod = 'weekly',
    limit: number = 10
  ): Promise<{
    entries: LeaderboardEntry[];
    error: Error | null;
  }> {
    return this.getGlobalLeaderboard(period, limit);
  }

  /**
   * Get nearby ranks (users around the current user's rank)
   */
  async getNearbyRanks(
    userId: string,
    period: LeaderboardPeriod = 'alltime',
    range: number = 5
  ): Promise<{
    entries: LeaderboardEntry[];
    userRank: number | null;
    error: Error | null;
  }> {
    try {
      // Get user's rank first
      const { rank: userRankData, error: rankError } = await this.getUserRank(userId, period);

      if (rankError || !userRankData || !userRankData.user_rank) {
        return { entries: [], userRank: null, error: rankError || new Error('User rank not found') };
      }

      const userRank = userRankData.user_rank;

      // Calculate offset and limit
      const offset = Math.max(0, userRank - range - 1);
      const limit = (range * 2) + 1;

      // Get leaderboard entries around the user
      const { entries, error } = await this.getGlobalLeaderboard(period, limit);

      if (error) {
        return { entries: [], userRank, error };
      }

      // Filter to get entries in the range
      const nearbyEntries = entries.filter(
        entry => entry.rank >= userRank - range && entry.rank <= userRank + range
      );

      return { entries: nearbyEntries, userRank, error: null };
    } catch (err) {
      return { entries: [], userRank: null, error: err as Error };
    }
  }

  /**
   * Get user's position on leaderboard (with context)
   */
  async getUserLeaderboardPosition(
    userId: string,
    period: LeaderboardPeriod = 'alltime'
  ): Promise<{
    rank: number | null;
    totalPlayers: number;
    percentile: number | null;
    aboveAverage: boolean;
    error: Error | null;
  }> {
    try {
      const { rank: rankData, error } = await this.getUserRank(userId, period);

      if (error || !rankData) {
        return {
          rank: null,
          totalPlayers: 0,
          percentile: null,
          aboveAverage: false,
          error: error || new Error('Rank data not found')
        };
      }

      const rank = rankData.user_rank || null;
      const totalPlayers = rankData.total_players;

      let percentile = null;
      let aboveAverage = false;

      if (rank && totalPlayers > 0) {
        percentile = Math.round((1 - (rank / totalPlayers)) * 100);
        aboveAverage = rank <= totalPlayers / 2;
      }

      return {
        rank,
        totalPlayers,
        percentile,
        aboveAverage,
        error: null
      };
    } catch (err) {
      return {
        rank: null,
        totalPlayers: 0,
        percentile: null,
        aboveAverage: false,
        error: err as Error
      };
    }
  }
}

export const leaderboardService = new LeaderboardService();
