# Migration Diagnostics Guide

## Problem
24 questions flagged for migration, but clicking "Migrate All Flagged" does nothing. No questions appear in production.

## Added Console Logging

I've added extensive console.log statements throughout the migration flow to help identify where it's failing:

### Key Log Points:

1. **QuestionReviewScreen** (`handleBatchMigrate`):
   - Logs when button is clicked
   - Logs when migration is confirmed
   - Logs the result from migration service
   - Logs any exceptions

2. **MigrationService** (`batchMigrateFlaggedQuestions`):
   - Logs when batch migration starts
   - Logs count of flagged questions fetched
   - Logs each question being migrated (with ID and preview text)
   - Logs success/failure for each question
   - Logs final summary

3. **MigrationService** (`getFlaggedQuestions`):
   - Logs query to questions_dev
   - Logs count of flagged questions found

4. **MigrationService** (`migrateQuestion`):
   - Logs each step:
     - Fetching question from dev
     - Looking up category in production
     - Checking for duplicates
     - **Authentication status check** (NEW)
     - Inserting into production
     - Unflagging question

## How to Diagnose

### Step 1: Open Console
- In React Native/Expo, open your development console
- Look for logs prefixed with `[MigrationService]` and `[QuestionReviewScreen]`

### Step 2: Click "Migrate All Flagged"
Watch the console output. You should see logs in this order:

```
[QuestionReviewScreen] handleBatchMigrate called, flaggedCount: 24
[QuestionReviewScreen] Migration confirmed, starting batch migration...
[MigrationService] batchMigrateFlaggedQuestions called
[MigrationService] Fetching flagged questions...
[MigrationService] getFlaggedQuestions: Querying questions_dev for ready_for_prod=true
[MigrationService] getFlaggedQuestions: Found 24 flagged questions
[MigrationService] Flagged questions fetched: 24 questions
[MigrationService] Starting migration of 24 questions
[MigrationService] Migrating question 1/24 (ID: ...): [question text preview]...
[MigrationService] migrateQuestion called for questionId: ...
[MigrationService] Fetching question ... from questions_dev...
[MigrationService] Question fetched from dev: { id, question_text, category }
[MigrationService] Looking for category "..." in production categories...
[MigrationService] Checking authentication status...
[MigrationService] Auth status: { isAuthenticated: true/false, userId: ..., error: ... }
[MigrationService] Inserting question into production questions table...
[MigrationService] Insert data: { ... }
[MigrationService] Failed to insert question into production: [ERROR DETAILS]
```

### Step 3: Identify the Failure Point

Look for where the logs stop or show errors:

#### If logs stop at "Fetching flagged questions":
- **Issue**: Can't query `questions_dev` table
- **Cause**: RLS policy blocking reads, or table doesn't exist
- **Fix**: Check RLS policies on `questions_dev` table

#### If logs stop at "Looking for category":
- **Issue**: Category not found in production
- **Cause**: Category doesn't exist in `categories` table
- **Fix**: Migrate categories first, or create them in production

#### If logs show "Auth status: { isAuthenticated: false }":
- **Issue**: User not authenticated
- **Cause**: User logged out or session expired
- **Fix**: Re-login to the app

#### If logs show "Failed to insert question into production":
- **Issue**: Insert into production `questions` table failed
- **Likely Causes**:
  1. **RLS policy blocking writes** (most common)
  2. **Missing required fields**
  3. **Data validation errors**

## Common Issues & Solutions

### Issue 1: RLS Policy Blocking Production Writes

**Symptoms:**
- Console shows: `Failed to insert question into production`
- Error message contains: `new row violates row-level security policy`
- Or: `permission denied for table questions`

**Diagnosis:**
Check if production `questions` table has RLS enabled and INSERT policies:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'questions';

-- Check existing policies
SELECT * FROM pg_policies 
WHERE tablename = 'questions';
```

**Solution:**
If RLS is enabled but no INSERT policy exists, add one:

```sql
-- Allow authenticated users to insert questions
CREATE POLICY "Authenticated users can insert questions"
ON questions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Or if you want to allow anyone (less secure):
CREATE POLICY "Anyone can insert questions"
ON questions FOR INSERT
WITH CHECK (true);
```

### Issue 2: Category Not Found

**Symptoms:**
- Console shows: `Category "[name]" not found in production`
- Error in migration result

**Solution:**
1. Check if category exists in production:
   ```sql
   SELECT * FROM categories WHERE name = '[category name]';
   ```

2. If missing, migrate the category first:
   ```sql
   -- Copy category from dev to prod
   INSERT INTO categories (name, description, sort_order)
   SELECT name, description, sort_order
   FROM categories_dev
   WHERE name = '[category name]'
   ON CONFLICT (name) DO NOTHING;
   ```

### Issue 3: Authentication Issues

**Symptoms:**
- Console shows: `Auth status: { isAuthenticated: false }`
- Error: `permission denied`

**Solution:**
1. Verify user is logged in
2. Check session hasn't expired
3. Try logging out and back in

### Issue 4: Duplicate Question

**Symptoms:**
- Console shows: `Question already exists in production`
- Question not migrated (expected behavior)

**Solution:**
- This is expected - the question is skipped
- Check if question text is truly duplicate
- If needed, edit question text in dev to make it unique

## Quick Check SQL Queries

Run these in Supabase SQL Editor to diagnose:

```sql
-- Check RLS status on production questions table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'questions';

-- Check policies on production questions table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'questions';

-- Count flagged questions in dev
SELECT COUNT(*) FROM questions_dev WHERE ready_for_prod = true;

-- Count questions in production
SELECT COUNT(*) FROM questions;

-- Check if categories exist in production
SELECT name FROM categories ORDER BY name;

-- Check if categories exist in dev
SELECT name FROM categories_dev ORDER BY name;

-- Check for missing categories (in dev but not prod)
SELECT cd.name 
FROM categories_dev cd
LEFT JOIN categories c ON c.name = cd.name
WHERE c.id IS NULL;
```

## Next Steps

1. **Run the migration** with console open
2. **Copy all console logs** that appear
3. **Check the error message** in the logs
4. **Run diagnostic SQL queries** above
5. **Fix the identified issue** based on the logs

## Expected Console Output (Success)

```
[QuestionReviewScreen] handleBatchMigrate called, flaggedCount: 24
[QuestionReviewScreen] Migration confirmed, starting batch migration...
[MigrationService] batchMigrateFlaggedQuestions called
[MigrationService] Fetching flagged questions...
[MigrationService] getFlaggedQuestions: Querying questions_dev for ready_for_prod=true
[MigrationService] getFlaggedQuestions: Found 24 flagged questions
[MigrationService] Flagged questions fetched: 24 questions
[MigrationService] Starting migration of 24 questions
[MigrationService] Migrating question 1/24 (ID: abc-123): Who built the ark?...
[MigrationService] migrateQuestion called for questionId: abc-123
...
[MigrationService] Question 1 migration result: SUCCESS Question migrated successfully
...
[MigrationService] Batch migration complete: { success: true, itemsMigrated: 24, ... }
```

## Reporting Issues

When reporting the issue, include:
1. Full console log output
2. Error message from logs
3. Results of diagnostic SQL queries
4. Whether user is authenticated
5. Whether categories exist in production
