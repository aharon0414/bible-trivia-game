# Question Import Guide

This guide explains how to import questions from CSV files into your dev environment for review and screening.

## Quick Start

### 1. Import Questions from CSV

Run the import script with your CSV file:

```bash
npm run import:questions bible-questions-characters.csv
```

Or specify the full path:

```bash
npm run import:questions /path/to/bible-questions-characters.csv
```

### 2. What the Script Does

- ✅ Parses your CSV file
- ✅ Creates categories in `categories_dev` if they don't exist
- ✅ Imports questions into `questions_dev` table
- ✅ Skips duplicate questions (based on question text)
- ✅ Provides detailed import statistics

### 3. Review Questions

After importing:
1. Switch your app to **dev mode**
2. Questions will appear in the app
3. Test them by playing games
4. Review question quality and accuracy

### 4. Promote to Production

Once questions are approved:
- Use the migration service to copy them to production
- Or use the migration utilities in `src/services/migration.service.ts`

## CSV Format

Your CSV file should have the following columns:

| Column | Required | Description |
|--------|----------|-------------|
| `Category` | ✅ Yes | Category name (e.g., "Characters") |
| `Difficulty` | ✅ Yes | One of: `beginner`, `intermediate`, `expert`, `scholar` |
| `Question` | ✅ Yes | The question text |
| `Option_A` | ⚠️ Optional | First multiple choice option |
| `Option_B` | ⚠️ Optional | Second multiple choice option |
| `Option_C` | ⚠️ Optional | Third multiple choice option |
| `Option_D` | ⚠️ Optional | Fourth multiple choice option |
| `Correct_Answer` | ✅ Yes | The correct answer |
| `Scripture_Reference` | ⚠️ Optional | Bible reference (e.g., "Exodus 3:10") |
| `Explanation` | ⚠️ Optional | Explanation of the answer |

### Example CSV Row

```csv
Category,Difficulty,Question,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Scripture_Reference,Explanation
Characters,beginner,Who led the Israelites out of Egypt?,Moses,Abraham,Joshua,David,Moses,Exodus 3:10,"God called Moses to lead the Israelites out of slavery in Egypt."
```

## Import Process

### Step 1: Prepare Your CSV

1. Ensure your CSV has the correct column headers
2. Check that all required fields are filled
3. Verify difficulty levels are valid: `beginner`, `intermediate`, `expert`, `scholar`

### Step 2: Set Up Credentials

**Option A: Use Service Role Key (Recommended)**

Create a `.env` file in your project root:

```env
SUPABASE_URL=https://wdprqnjcfzuamzhtgiog.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

Get your service role key from: Supabase Dashboard → Settings → API → service_role key

**Option B: Relax RLS Policies**

If you prefer not to use service role key, run this SQL in Supabase:

```sql
-- Run: database/relax-dev-rls-policies.sql
```

This allows the import script to work with the anon key.

### Step 3: Run Import

```bash
npm run import:questions bible-questions-characters.csv
```

The script will:
- Show progress as it imports
- Create categories automatically if needed
- Skip duplicate questions
- Report any errors

### Step 4: Check Results

After import, you'll see a summary:
```
📊 Import Summary
==================================================
✅ Successfully imported: 158
⏭️  Skipped (duplicates): 2
❌ Errors: 0
```

### Step 5: Review in App

1. **Switch to dev mode** in your app
2. **Start a game** to see the imported questions
3. **Test questions** for accuracy and quality
4. **Note any issues** that need fixing

## Using the Admin Service

The `questionAdminService` provides methods for managing questions programmatically:

```typescript
import { questionAdminService } from './services/question-admin.service';

// Get all dev questions for review
const { questions } = await questionAdminService.getDevQuestionsForReview();

// Get question statistics
const { stats } = await questionAdminService.getQuestionStats();
// Returns: { total, active, inactive, byDifficulty, byCategory }

// Toggle question active status
await questionAdminService.toggleQuestionActive(questionId);

// Update a question
await questionAdminService.updateDevQuestion(questionId, {
  questionText: 'Updated question text',
  explanation: 'Updated explanation',
});

// Delete a question
await questionAdminService.deleteDevQuestion(questionId);
```

## Workflow Recommendations

### Recommended Process

1. **Import** → Run CSV import script
2. **Review** → Test questions in dev mode
3. **Edit** → Fix any issues using admin service or directly in Supabase
4. **Approve** → Mark questions as ready (set `is_active = true`)
5. **Migrate** → Use migration service to copy approved questions to production

### Screening Checklist

When reviewing questions, check:
- ✅ Question text is clear and grammatically correct
- ✅ Correct answer matches one of the options
- ✅ All options are plausible (not obviously wrong)
- ✅ Bible reference is accurate
- ✅ Explanation is helpful and accurate
- ✅ Difficulty level is appropriate
- ✅ No duplicate questions

## Troubleshooting

### "File not found" Error

Make sure you're running the script from the project root:
```bash
cd /path/to/bible-trivia-game
npm run import:questions bible-questions-characters.csv
```

### RLS (Row Level Security) Errors

If you see errors like:
- `new row violates row-level security policy`
- `permission denied for table categories_dev`

**Solution 1 (Recommended):** Use service role key:
1. Get service role key from Supabase Dashboard → Settings → API
2. Add to `.env` file: `SUPABASE_SERVICE_KEY=your-key-here`
3. Restart import script

**Solution 2:** Relax RLS policies:
1. Run `database/relax-dev-rls-policies.sql` in Supabase SQL Editor
2. This allows unauthenticated inserts on dev tables

### "Category not found" Error

The script automatically creates categories. If you see this error, check:
- Category name spelling in CSV
- Supabase connection is working
- RLS policies allow inserts (see above)

### "Duplicate question" Warnings

This is normal! The script skips questions that already exist (based on question text). This prevents importing the same question twice.

### Questions Not Appearing in App

1. **Check environment** → Make sure you're in dev mode
2. **Verify import** → Check `questions_dev` table in Supabase
3. **Check filters** → Make sure questions have `is_active = true`
4. **Refresh app** → Restart the app to reload data

## Environment Variables (Required for Import)

The import script needs to bypass RLS (Row Level Security) to insert questions. You have two options:

### Option 1: Use Service Role Key (Recommended)

Create a `.env` file with your service role key:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

**To find your service role key:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy the `service_role` key (NOT the anon key)
4. Add it to your `.env` file

**Important:** The service role key bypasses RLS and has admin access. Keep it secure and never commit it to git!

### Option 2: Relax RLS Policies (Alternative)

If you can't use the service role key, run this SQL in Supabase to relax RLS on dev tables:

```sql
-- Run: database/relax-dev-rls-policies.sql
```

This allows unauthenticated inserts on dev tables (safe since they're isolated from production).

## Next Steps

After importing and reviewing:

1. **Create a review screen** in your app to browse/edit questions
2. **Add approval workflow** to mark questions as ready for production
3. **Set up batch migration** to promote multiple approved questions at once
4. **Track question performance** using the `times_answered` and `times_correct` fields

## Example: Import Your CSV

```bash
# From project root
npm run import:questions bible-questions-characters.csv
```

This will import all 160 questions from your CSV into the dev environment, ready for review!
