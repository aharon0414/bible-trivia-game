# Quick Start: Import Your 160 Questions

## Step 1: Import Questions from CSV

Run this command from your project root:

```bash
npm run import:questions bible-questions-characters.csv
```

This will:
- ✅ Parse your CSV file
- ✅ Create "Characters" category in dev if needed
- ✅ Import all 160 questions into `questions_dev` table
- ✅ Skip any duplicates
- ✅ Show you a summary of what was imported

**Expected output:**
```
📖 Starting CSV import...

📊 Found 160 questions in CSV

   Imported 10 questions...
   Imported 20 questions...
   ...
   
==================================================
📊 Import Summary
==================================================
✅ Successfully imported: 160
⏭️  Skipped (duplicates): 0
❌ Errors: 0

✨ Import complete!
```

## Step 2: Review Questions in App

1. **Start your app** (make sure you're in dev mode)
2. **Go to Home screen**
3. **Tap "📝 Review Questions"**
4. **Browse and test your questions**

The review screen shows:
- All imported questions
- Question details (options, correct answer, explanation)
- Statistics (total, active, inactive)
- Filters by difficulty
- Actions: Activate/Deactivate, Migrate to Prod, Delete

## Step 3: Test Questions

1. **Switch to dev mode** (if not already)
2. **Start a game** from the Home screen
3. **Play through questions** to test them
4. **Note any issues** that need fixing

## Step 4: Approve and Migrate

Once questions are tested and approved:

1. **In Review Screen**, tap "Migrate to Prod" on approved questions
2. **Or use migration service** to migrate in bulk:

```typescript
import { migrationService } from './services/migration.service';

// Migrate a single question
await migrationService.migrateQuestion(questionId);

// Or migrate all questions from a category
await migrationService.migrateCategoryQuestions(categoryId);
```

## Troubleshooting

### Script won't run

Make sure you're in the project root:
```bash
cd /path/to/bible-trivia-game
npm run import:questions bible-questions-characters.csv
```

### "Cannot find module" error

The script uses `@supabase/supabase-js` which should already be installed. If not:
```bash
npm install @supabase/supabase-js
```

### Questions not appearing

1. Make sure you're in **dev mode**
2. Check that questions were imported (look in Supabase Table Editor)
3. Verify questions have `is_active = true`
4. Restart your app

### CSV parsing errors

The script handles:
- Quoted fields (with commas inside)
- Missing optional fields
- Different line endings

If you see parsing errors, check your CSV format matches the expected structure.

## What Gets Imported

From your CSV, the script imports:
- ✅ Category → Creates/uses `categories_dev`
- ✅ Difficulty → Validated (beginner/intermediate/expert/scholar)
- ✅ Question text → `question_text`
- ✅ Options A-D → `option_a` through `option_d`
- ✅ Correct Answer → `correct_answer`
- ✅ Scripture Reference → `bible_reference`
- ✅ Explanation → `explanation`
- ✅ Question Type → Set to `multiple_choice` (all CSV questions are multiple choice)

## Next Steps After Import

1. **Review** → Use the Review screen to check all questions
2. **Test** → Play games in dev mode to test questions
3. **Edit** → Fix any issues directly in Supabase or via the admin service
4. **Approve** → Mark questions as active when ready
5. **Migrate** → Copy approved questions to production

## Workflow Summary

```
CSV File → Import Script → Dev Tables → Review Screen → Test in App → Migrate to Prod
```

That's it! Your 160 questions will be ready for review in dev mode. 🎉




