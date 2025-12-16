# Bible Trivia Game

A React Native trivia game with Supabase backend, featuring a complete dev/prod environment system for question management and review.

## Features

- **Dual Environment System**: Separate dev and production tables for safe content testing
- **Question Import**: CSV import script with duplicate detection
- **Question Review**: In-app question review and approval workflow
- **Migration System**: Migrate approved questions from dev to production
- **Authentication**: Complete signup/login system
- **Game Modes**: 4 difficulty levels (Beginner, Intermediate, Expert, Scholar)
- **Timer**: 30-second countdown per question
- **Score Tracking**: Real-time score and statistics

## Tech Stack

- **Frontend**: React Native + Expo + TypeScript
- **Backend**: Supabase (PostgreSQL)
- **Navigation**: React Navigation (Native Stack)
- **Storage**: AsyncStorage for environment persistence
- **State**: React Context API

## Project Structure

```
bible-trivia-game/
├── src/
│   ├── config/
│   │   └── environment.ts          # Environment manager singleton
│   ├── contexts/
│   │   ├── AuthContext.tsx         # Authentication context
│   │   └── EnvironmentContext.tsx  # Environment switching context
│   ├── navigation/
│   │   ├── RootNavigator.tsx       # Auth flow routing
│   │   └── MainNavigator.tsx       # Main app routing
│   ├── screens/
│   │   ├── LoginScreen.tsx         # Authentication
│   │   ├── HomeScreen.tsx          # Main menu
│   │   ├── DifficultyScreen.tsx    # Difficulty selection
│   │   ├── GameScreen.tsx          # Gameplay with dev mode
│   │   ├── ResultsScreen.tsx       # Score results
│   │   └── QuestionReviewScreen.tsx # Question management
│   ├── services/
│   │   ├── auth.service.ts         # Authentication logic
│   │   ├── question.service.ts     # Question queries (env-aware)
│   │   ├── game.service.ts         # Game session management (env-aware)
│   │   ├── user-stats.service.ts   # User statistics (env-aware)
│   │   ├── migration.service.ts    # Dev→Prod migration
│   │   └── question-admin.service.ts # Question CRUD operations
│   └── types/
│       └── database.ts             # TypeScript database types
├── database/
│   ├── schema.sql                  # Production table schema
│   ├── seed.sql                    # Sample data
│   ├── create-dev-tables.sql       # Development tables (RUN THIS!)
│   └── relax-dev-rls-policies.sql  # Optional RLS relaxation
├── scripts/
│   └── import-questions-from-csv.js # CSV import utility
└── Documentation guides (see below)
```

## Quick Start

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Set Up Environment Variables

Create `.env` file:

```env
# Your Supabase project URL
SUPABASE_URL=https://your-project.supabase.co

# Service role key (for CSV imports - bypasses RLS)
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Anon key (for app - already in code, optional to override)
SUPABASE_ANON_KEY=your-anon-key
```

Get your service role key from: **Supabase Dashboard → Settings → API → service_role**

### 3. Create Dev Tables in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
-- Run: database/create-dev-tables.sql
```

This creates:
- `categories_dev`, `questions_dev`, `game_sessions_dev`, `game_answers_dev`, `category_stats_dev`
- RLS policies for dev tables
- Sample categories and questions

### 4. Import Questions from CSV

```bash
npm run import:questions bible-questions-characters.csv
```

This will:
- Parse your CSV file
- Create categories if needed
- Import questions into `questions_dev`
- Skip duplicates
- Show import statistics

### 5. Run the App

```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- Scan QR code for physical device

## Environment System

The app uses parallel dev/prod database tables for safe content development:

### Tables

**Production:**
- `categories`, `questions`, `game_sessions`, `game_answers`, `category_stats`

**Development:**
- `categories_dev`, `questions_dev`, `game_sessions_dev`, `game_answers_dev`, `category_stats_dev`

**Shared:**
- `profiles`, `user_stats` (user-specific data)

### Switching Environments

Environment is stored in AsyncStorage and persists across sessions.

**Programmatically:**
```typescript
import { environmentManager } from './src/config/environment';

// Switch to dev mode
await environmentManager.setEnvironment('development');

// Switch to prod mode
await environmentManager.setEnvironment('production');

// Get current environment
const env = environmentManager.getEnvironment(); // 'development' | 'production'
```

**In Components:**
```typescript
import { useEnvironment } from './src/contexts/EnvironmentContext';

function MyComponent() {
  const { environment, setEnvironment, isDevelopment } = useEnvironment();

  return (
    <Button
      onPress={() => setEnvironment('development')}
      title={isDevelopment ? '🔧 Dev Mode' : '🚀 Prod Mode'}
    />
  );
}
```

### All Services Are Environment-Aware

Services automatically query the correct tables based on current environment:

```typescript
import { questionService } from './src/services/question.service';

// Automatically uses questions_dev or questions based on environment
const { questions } = await questionService.getQuestionsByDifficulty('beginner', 10);
```

## CSV Import Workflow

### CSV Format

Your CSV should have these columns:

| Column | Required | Description |
|--------|----------|-------------|
| Category | ✅ | Category name |
| Difficulty | ✅ | beginner, intermediate, expert, or scholar |
| Question | ✅ | The question text |
| Correct_Answer | ✅ | The correct answer |
| Option_A | ⚠️ Optional | First choice |
| Option_B | ⚠️ Optional | Second choice |
| Option_C | ⚠️ Optional | Third choice |
| Option_D | ⚠️ Optional | Fourth choice |
| Scripture_Reference | ⚠️ Optional | Bible verse reference |
| Explanation | ⚠️ Optional | Answer explanation |

### Import Process

1. **Prepare CSV**: Ensure format matches above
2. **Set up credentials**: Add `SUPABASE_SERVICE_KEY` to `.env`
3. **Run import**: `npm run import:questions your-file.csv`
4. **Review in app**: Switch to dev mode and test questions
5. **Approve**: Flag good questions for production
6. **Migrate**: Use QuestionReviewScreen to migrate to prod

## Migration Workflow

### 1. Create/Import Questions in Dev

- Import from CSV
- Or create manually in Supabase

### 2. Review Questions

- Switch app to dev mode
- Navigate to QuestionReview screen
- Filter by difficulty/status
- Test questions by playing games

### 3. Flag for Production

**In QuestionReviewScreen:**
- Tap "Flag for Prod" on individual questions
- Use "Migrate All Flagged" button for batch migration

**During Gameplay (Dev Mode):**
- After answering, tap "✅ Flag for Prod"

### 4. Migrate to Production

```typescript
import { migrationService } from './src/services/migration.service';

// Migrate single question
await migrationService.migrateQuestion(questionId);

// Migrate entire category
await migrationService.migrateCategoryQuestions(categoryId);

// Batch migrate all flagged
await migrationService.batchMigrateFlaggedQuestions();
```

### 5. Test in Production

- Switch to production mode
- Test migrated questions
- Monitor for issues

## Development Workflow

```
┌─────────────────┐
│  Create/Import  │  Import CSV or create in Supabase
│   in Dev Mode   │  (questions_dev table)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Review & Test  │  Use QuestionReview screen
│   Questions     │  Play games in dev mode
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Flag Approved   │  Mark good questions
│   Questions     │  Flag for production
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Migrate to     │  Use migration service
│   Production    │  Batch or individual
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Test in Prod   │  Switch to prod mode
│      Mode       │  Verify questions work
└─────────────────┘
```

## Available Scripts

```bash
# Start Expo dev server
npm start

# Run on specific platform
npm run ios
npm run android
npm run web

# Import questions from CSV
npm run import:questions <filename.csv>

# Run tests
npm test
npm run test:watch
npm run test:coverage
```

## Documentation Guides

Comprehensive guides are available:

- **[DEV_PROD_MIGRATION_GUIDE.md](./DEV_PROD_MIGRATION_GUIDE.md)** - Complete environment system guide
- **[QUESTION_IMPORT_GUIDE.md](./QUESTION_IMPORT_GUIDE.md)** - Detailed CSV import instructions
- **[QUICK_START_IMPORT.md](./QUICK_START_IMPORT.md)** - Quick reference for importing

## Database Schema

See `database/schema.sql` for complete production schema.

Key tables:
- **categories**: Question categories
- **questions**: All trivia questions
- **profiles**: User accounts (managed by Supabase Auth)
- **game_sessions**: Game play sessions
- **game_answers**: Individual question answers
- **user_stats**: User performance statistics
- **category_stats**: Per-category user statistics

## Known Issues

1. **Dependency Warning**: `@testing-library/react-hooks` has peer dependency conflict - requires `--legacy-peer-deps` to install (non-critical)

2. **Missing Features**:
   - Environment switcher UI not in HomeScreen (needs to be added)
   - Edit question UI is placeholder (service exists, UI needed)
   - Leaderboard screen is placeholder
   - My Stats screen is placeholder

## Troubleshooting

### CSV Import Fails with RLS Error

**Solution 1**: Use service role key in `.env`
```env
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Solution 2**: Relax RLS policies for dev tables
```sql
-- Run: database/relax-dev-rls-policies.sql
```

### Questions Not Appearing

1. Check you're in correct environment (dev vs prod)
2. Verify questions have `is_active = true`
3. Check Supabase Table Editor for data
4. Restart app to reload

### Environment Not Persisting

- Ensure `EnvironmentProvider` wraps app in `App.tsx`
- Check AsyncStorage permissions
- Clear app data and restart

## Contributing

1. Create questions in dev mode
2. Test thoroughly
3. Flag for production
4. Migrate using migration service
5. Verify in production mode

## License

Private project - All rights reserved
