# Dev/Prod Environment System Guide

This guide explains how to use the development/production environment system for the Bible Trivia Game.

## Overview

The app uses parallel database tables within the same Supabase project:
- **Production tables**: `categories`, `questions`, `game_sessions`, `game_answers`, `category_stats`
- **Development tables**: `categories_dev`, `questions_dev`, `game_sessions_dev`, `game_answers_dev`, `category_stats_dev`

This allows you to:
- Test new content in development without affecting production data
- Develop and iterate on questions/categories safely
- Migrate approved content from dev to production when ready

## Setup

### 1. Create Dev Tables

Run the SQL migration script in your Supabase SQL Editor:

```sql
-- Run: database/create-dev-tables.sql
```

This creates all the `_dev` tables with the same schema as production tables, plus RLS policies and sample data.

### 2. Environment Switching

The app automatically uses the correct tables based on the current environment mode.

#### Via UI:
1. Open the app
2. Go to Home screen
3. Tap "🔧 Dev Environment" or "🚀 Production Environment"
4. Select your desired mode
5. Confirm the switch

#### Programmatically:
```typescript
import { environmentManager } from './src/config/environment';

// Switch to development
await environmentManager.setEnvironment('development');

// Switch to production
await environmentManager.setEnvironment('production');

// Get current environment
const env = environmentManager.getEnvironment(); // 'development' | 'production'

// Get table names for current environment
const tables = environmentManager.getTables();
// Returns: { categories: 'categories_dev', questions: 'questions_dev', ... }
```

## Using the Services

All services automatically use the correct tables based on the current environment:

```typescript
import { questionService } from './src/services/question.service';
import { gameService } from './src/services/game.service';
import { userStatsService } from './src/services/user-stats.service';

// These automatically query dev or prod tables based on current environment
const { categories } = await questionService.getCategories();
const { session } = await gameService.createSession({ ... });
const { stats } = await userStatsService.getCategoryStats(userId);
```

## Migration Utilities

The migration service helps you copy approved content from dev to production.

### Migrate a Single Category

```typescript
import { migrationService } from './src/services/migration.service';

const result = await migrationService.migrateCategory(categoryId);
if (result.success) {
  console.log(result.message); // "Category 'Characters' migrated successfully"
}
```

### Migrate a Single Question

```typescript
const result = await migrationService.migrateQuestion(questionId);
if (result.success) {
  console.log(result.message); // "Question migrated successfully"
}
```

### Migrate Multiple Questions

```typescript
const questionIds = ['uuid1', 'uuid2', 'uuid3'];
const result = await migrationService.migrateQuestions(questionIds);
console.log(`Migrated ${result.itemsMigrated} questions`);
```

### Migrate All Questions in a Category

```typescript
// This will:
// 1. Migrate the category itself (if not already in prod)
// 2. Migrate all questions in that category
const result = await migrationService.migrateCategoryQuestions(categoryId);
```

### Preview What Would Be Migrated

```typescript
// See what's available to migrate (dry run)
const preview = await migrationService.previewMigration();
console.log(`${preview.categories} categories and ${preview.questions} questions available`);

// Or for a specific category
const preview = await migrationService.previewMigration(categoryId);
```

### Get Lists of Unmigrated Content

```typescript
// Get categories in dev that aren't in prod
const { categories } = await migrationService.getUnmigratedCategories();

// Get questions in dev that aren't in prod
const { questions } = await migrationService.getUnmigratedQuestions();

// Get questions for a specific category
const { questions } = await migrationService.getUnmigratedQuestions(categoryId);
```

## Migration Rules

1. **Categories**: Migrated by name. If a category with the same name already exists in production, migration is skipped.

2. **Questions**: Migrated by question text. If a question with the same text already exists in production, migration is skipped.

3. **Category References**: When migrating a question, the service automatically maps the dev category to the production category by matching category names.

4. **Dependencies**: Questions require their category to exist in production. If the category doesn't exist, migrate the category first, or use `migrateCategoryQuestions()` which handles both.

## Best Practices

1. **Always test in dev first**: Create and test new content in development mode before migrating to production.

2. **Review before migrating**: Use `getUnmigratedQuestions()` or `previewMigration()` to review what will be migrated.

3. **Migrate in batches**: Use `migrateCategoryQuestions()` to migrate entire categories at once, ensuring consistency.

4. **Check for duplicates**: The migration service automatically skips duplicates, but it's good practice to review first.

5. **Keep environments in sync**: Periodically check that your dev tables have the latest production content if needed.

## Environment Context

The app uses React Context to manage environment state:

```typescript
import { useEnvironment } from './src/contexts/EnvironmentContext';

function MyComponent() {
  const { environment, setEnvironment, isDevelopment, isProduction } = useEnvironment();
  
  return (
    <View>
      <Text>Current: {environment}</Text>
      {isDevelopment && <Text>🔧 Development Mode</Text>}
      {isProduction && <Text>🚀 Production Mode</Text>}
    </View>
  );
}
```

## Troubleshooting

### "Category not found in production"
- Make sure to migrate the category first before migrating questions.

### "Question already exists"
- The question text already exists in production. This is skipped automatically.

### Environment not persisting
- The environment is stored in AsyncStorage. Make sure AsyncStorage is properly configured.

### Services using wrong tables
- Ensure `EnvironmentProvider` wraps your app in `App.tsx`
- Check that services are using `environmentManager.getTables()` instead of hardcoded table names

## Architecture

```
App.tsx
  └─ EnvironmentProvider (manages environment state)
      └─ AuthProvider
          └─ RootNavigator
              └─ Screens (can use useEnvironment hook)

Services (automatically use correct tables):
  ├─ questionService → uses environmentManager.getTables()
  ├─ gameService → uses environmentManager.getTables()
  ├─ userStatsService → uses environmentManager.getTables()
  └─ migrationService → copies from dev to prod tables
```

## Database Schema

Both dev and prod tables have identical schemas:

- `categories` / `categories_dev`
- `questions` / `questions_dev`
- `game_sessions` / `game_sessions_dev`
- `game_answers` / `game_answers_dev`
- `category_stats` / `category_stats_dev`

Note: `user_stats` and `profiles` are shared between environments (user-specific data doesn't need isolation).
