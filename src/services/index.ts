// Supabase client
export { supabase } from './supabase';

// Services
export { authService } from './auth.service';
export { gameService } from './game.service';
export { questionService } from './question.service';
export { userStatsService } from './user-stats.service';

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
  LeaderboardEntry,
} from './user-stats.service';
