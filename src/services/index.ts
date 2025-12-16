// Supabase client
export { supabase } from './supabase';

// Services
export { authService } from './auth.service';
export { gameService } from './game.service';
export { questionService } from './question.service';
export { userStatsService } from './user-stats.service';
export { questionAdminService } from './question-admin.service';
export { migrationService } from './migration.service';
export { leaderboardService } from './leaderboard.service';

// Types from services
export type {
  AuthResponse,
  SignUpData,
  SignInData
} from './auth.service';

export type {
  CreateGameSessionData,
  SubmitAnswerData,
  GameSessionWithAnswers,
} from './game.service';

export type {
  QuestionFilters,
  QuestionWithCategory,
} from './question.service';

export type {
  LeaderboardEntry as UserStatsLeaderboardEntry,
} from './user-stats.service';

export type {
  LeaderboardEntry,
  LeaderboardPeriod,
  UserRank,
  UserProfile,
} from './leaderboard.service';
