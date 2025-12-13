# Backend Services Documentation

This document describes the backend services for the Bible Trivia Game.

## Overview

The backend consists of four main service modules:
- **AuthService**: User authentication and session management
- **GameService**: Game session and answer tracking
- **QuestionService**: Question fetching and category management
- **UserStatsService**: User statistics and leaderboard

## Services

### AuthService (`src/services/auth.service.ts`)

Handles all authentication operations using Supabase Auth.

**Key Methods:**
```typescript
// Sign up a new user
await authService.signUp({ email, password, displayName });

// Sign in
await authService.signIn({ email, password });

// Sign out
await authService.signOut();

// Get current session
await authService.getSession();

// Get current user
await authService.getCurrentUser();

// Password reset
await authService.resetPassword(email);

// Update password
await authService.updatePassword(newPassword);

// Update profile
await authService.updateProfile({ displayName: 'New Name' });

// Listen to auth state changes
const subscription = authService.onAuthStateChange((user, session) => {
  console.log('Auth state changed:', user);
});
// Don't forget to unsubscribe: subscription.unsubscribe();

// Check if authenticated
const isAuth = await authService.isAuthenticated();

// Refresh session
await authService.refreshSession();
```

### GameService (`src/services/game.service.ts`)

Manages game sessions and answer submissions.

**Key Methods:**
```typescript
// Create a new game session
const { session } = await gameService.createSession({
  userId: 'user-uuid',
  categoryId: 'category-uuid',
  difficulty: 'intermediate',
  totalQuestions: 10
});

// Submit an answer
const { answer } = await gameService.submitAnswer({
  sessionId: 'session-uuid',
  questionId: 'question-uuid',
  userAnswer: 'Moses',
  isCorrect: true,
  timeTakenSeconds: 5
});

// Complete a session
await gameService.completeSession('session-uuid');

// Get a session
const { session } = await gameService.getSession('session-uuid');

// Get session with all answers
const { session } = await gameService.getSessionWithAnswers('session-uuid');

// Get user's sessions
const { sessions } = await gameService.getUserSessions('user-uuid', 20);

// Get active (incomplete) session
const { session } = await gameService.getActiveSession('user-uuid');

// Get session answers
const { answers } = await gameService.getSessionAnswers('session-uuid');

// Get session statistics
const { stats } = await gameService.getSessionStats('session-uuid');
// Returns: { totalAnswered, correctAnswers, incorrectAnswers,
//            accuracyPercentage, averageTimePerQuestion }

// Delete a session
await gameService.deleteSession('session-uuid');
```

### QuestionService (`src/services/question.service.ts`)

Handles question fetching, filtering, and category management.

**Key Methods:**
```typescript
// Get all categories
const { categories } = await questionService.getCategories();

// Get a specific category
const { category } = await questionService.getCategory('category-uuid');

// Get random questions with filters
const { questions } = await questionService.getRandomQuestions(10, {
  categoryId: 'category-uuid',
  difficulty: 'intermediate',
  questionType: 'multiple_choice',
  excludeIds: ['q1', 'q2'] // Exclude previously answered questions
});

// Get a specific question
const { question } = await questionService.getQuestion('question-uuid');

// Get question with category info
const { question } = await questionService.getQuestionWithCategory('question-uuid');

// Get questions with category info
const { questions } = await questionService.getQuestionsWithCategory({
  categoryId: 'category-uuid',
  difficulty: 'beginner'
});

// Get question count
const { count } = await questionService.getQuestionCount({
  categoryId: 'category-uuid',
  difficulty: 'expert'
});

// Validate an answer
const isCorrect = questionService.validateAnswer(question, userAnswer);

// Get question options (for multiple choice)
const options = questionService.getQuestionOptions(question);
// Returns: ['Option A', 'Option B', 'Option C', 'Option D']

// Get questions by category
const { questions } = await questionService.getQuestionsByCategory('category-uuid', 10);

// Get questions by difficulty
const { questions } = await questionService.getQuestionsByDifficulty('scholar', 10);

// Search questions
const { questions } = await questionService.searchQuestions('Moses');
```

### UserStatsService (`src/services/user-stats.service.ts`)

Tracks user progress, statistics, and leaderboards.

**Key Methods:**
```typescript
// Get or create user stats
const { stats } = await userStatsService.getUserStats('user-uuid');

// Update stats after a game
await userStatsService.updateStatsAfterGame('user-uuid', {
  questionsAnswered: 10,
  correctAnswers: 8,
  points: 800,
  newStreak: 3
});

// Get category stats for user
const { stats } = await userStatsService.getCategoryStats('user-uuid');
// Or for specific category:
const { stats } = await userStatsService.getCategoryStats('user-uuid', 'category-uuid');

// Update category stats after game
await userStatsService.updateCategoryStats('user-uuid', 'category-uuid', {
  questionsAnswered: 10,
  correctAnswers: 8,
  score: 8
});

// Get difficulty stats
const { stats } = await userStatsService.getDifficultyStats('user-uuid');

// Get global leaderboard
const { leaderboard } = await userStatsService.getLeaderboard(10);

// Get user's rank
const { rank } = await userStatsService.getUserRank('user-uuid');

// Get accuracy percentage
const { accuracy } = await userStatsService.getAccuracyPercentage('user-uuid');

// Reset user stats
await userStatsService.resetUserStats('user-uuid');
```

## Database Schema

You need to create the following tables in Supabase:

### categories
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

### questions
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert', 'scholar')),
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank')),
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  bible_reference TEXT
);
```

### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### game_sessions
```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert', 'scholar')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE
);
```

### game_answers
```sql
CREATE TABLE game_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_taken_seconds INTEGER
);
```

### user_stats
```sql
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  total_games_played INTEGER NOT NULL DEFAULT 0,
  total_questions_answered INTEGER NOT NULL DEFAULT 0,
  total_correct_answers INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### category_stats
```sql
CREATE TABLE category_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  games_played INTEGER NOT NULL DEFAULT 0,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  average_score DECIMAL NOT NULL DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, category_id)
);
```

## Usage Example

Here's a complete example of a game flow:

```typescript
import {
  authService,
  gameService,
  questionService,
  userStatsService
} from './services';

async function playGame() {
  // 1. Authenticate user
  const { user, error: authError } = await authService.signIn({
    email: 'player@example.com',
    password: 'password123'
  });

  if (authError || !user) {
    console.error('Authentication failed');
    return;
  }

  // 2. Get categories and let user choose
  const { categories } = await questionService.getCategories();
  const selectedCategory = categories[0];

  // 3. Create game session
  const { session } = await gameService.createSession({
    userId: user.id,
    categoryId: selectedCategory.id,
    difficulty: 'intermediate',
    totalQuestions: 10
  });

  if (!session) {
    console.error('Failed to create game session');
    return;
  }

  // 4. Get random questions
  const { questions } = await questionService.getRandomQuestions(10, {
    categoryId: selectedCategory.id,
    difficulty: 'intermediate'
  });

  // 5. Player answers questions
  for (const question of questions) {
    const userAnswer = 'Moses'; // Get from user input
    const isCorrect = questionService.validateAnswer(question, userAnswer);

    await gameService.submitAnswer({
      sessionId: session.id,
      questionId: question.id,
      userAnswer,
      isCorrect,
      timeTakenSeconds: 5
    });
  }

  // 6. Complete session
  await gameService.completeSession(session.id);

  // 7. Get final stats
  const { stats } = await gameService.getSessionStats(session.id);

  // 8. Update user stats
  await userStatsService.updateStatsAfterGame(user.id, {
    questionsAnswered: stats!.totalAnswered,
    correctAnswers: stats!.correctAnswers,
    points: stats!.correctAnswers * 100,
    newStreak: 1
  });

  // 9. Update category stats
  await userStatsService.updateCategoryStats(user.id, selectedCategory.id, {
    questionsAnswered: stats!.totalAnswered,
    correctAnswers: stats!.correctAnswers,
    score: stats!.correctAnswers
  });

  console.log('Game completed!', stats);
}
```

## Error Handling

All service methods return an object with `error` property:

```typescript
const { data, error } = await someService.someMethod();

if (error) {
  console.error('Operation failed:', error.message);
  // Handle error
} else {
  // Use data
}
```

## Best Practices

1. **Always check for errors** before using returned data
2. **Use TypeScript types** for type safety
3. **Complete sessions** when a game is finished
4. **Update stats** after each game completion
5. **Unsubscribe from auth listeners** when component unmounts
6. **Validate answers** server-side (future enhancement)

## Next Steps

1. Set up the database tables in Supabase
2. Configure Row Level Security (RLS) policies
3. Add indexes for better query performance
4. Implement server-side answer validation
5. Add real-time subscriptions for multiplayer features
