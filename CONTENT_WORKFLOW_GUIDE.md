# Content Management Workflow Guide

## Overview

This guide explains the complete workflow for creating, reviewing, and publishing Bible trivia questions from development to production. The system is designed to ensure high-quality, educationally rich content while maintaining production safety.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Environment System](#environment-system)
3. [Question Creation Workflow](#question-creation-workflow)
4. [Review & Quality Assurance](#review--quality-assurance)
5. [Migration to Production](#migration-to-production)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Dual Environment System

The app uses **two parallel database environments**:

- **Development (`_dev` tables)**: Safe sandbox for creating and testing questions
- **Production (no suffix)**: Live questions that users see in the game

```
Development Flow:
┌─────────────┐    ┌──────────┐    ┌────────────┐    ┌────────────┐
│   Create    │ → │  Review  │ → │    Flag    │ → │  Migrate   │
│  Question   │    │  & Edit  │    │  for Prod  │    │  to Prod   │
└─────────────┘    └──────────┘    └────────────┘    └────────────┘
```

### Database Tables

**Development Tables:**
- `categories_dev` - Category definitions with educational metadata
- `questions_dev` - Questions with `ready_for_prod` flag

**Production Tables:**
- `categories` - Live categories
- `questions` - Live questions available to users

---

## Environment System

### Switching Environments

**In the App:**
1. Open the Home screen
2. Look for the "Content Management" section
3. Current environment is displayed: `DEVELOPMENT MODE` or `PRODUCTION MODE`
4. Click "Switch to Production/Development" to toggle

**What Changes:**
- All database queries automatically use the correct tables
- Create/Edit tools only appear in Development mode
- Users playing the game only see Production questions

### Environment States

| Environment | Features Available |
|------------|-------------------|
| **Development** | ✅ Create questions<br>✅ Edit questions<br>✅ Delete questions<br>✅ Batch review<br>✅ Flag for production<br>✅ Migrate to production |
| **Production** | ❌ No editing (read-only)<br>✅ View statistics<br>✅ Play game with live questions |

---

## Question Creation Workflow

### Step 1: Create a New Question

**Navigate:** Home → Create Question

**Required Fields:**
- **Category** - Select from existing categories (Characters, Events, Locations, etc.)
- **Difficulty** - beginner | intermediate | expert | scholar
- **Question Type** - Multiple Choice, True/False, or Fill in the Blank
- **Question Text** - The actual question (clear and specific)
- **Correct Answer** - Must match an option for multiple choice

**Recommended Fields:**
- **Bible Reference** - Scripture location (e.g., "John 3:16", "Genesis 1:1-3")
- **Explanation** - 1-2 sentences explaining why the answer is correct
- **Teaching Notes** - Deeper theological/historical context, cross-references
- **Tags** - Comma-separated (e.g., "Covenant, Exodus, Moses")

**For Multiple Choice:**
- Provide at least 2 options (A, B, C, D)
- Correct answer must **exactly match** one of the options
- Use clear, distinct options (avoid similar wording)

### Step 2: Preview & Validate

1. Click **"Preview"** to see formatted question
2. System automatically validates:
   - Required fields are filled
   - Multiple choice has enough options
   - Correct answer matches an option
   - Scholar difficulty includes explanation

3. If validation fails, you'll see specific error messages

### Step 3: Save Question

1. Click **"Create Question"**
2. Question is saved to `questions_dev` table
3. Choose next action:
   - **"Create Another"** - Clears form, keeps category/difficulty/type for rapid entry
   - **"Review Questions"** - Go to Question Review screen

**What Happens:**
```sql
INSERT INTO questions_dev (
  category_id,
  difficulty,
  question_type,
  question_text,
  correct_answer,
  option_a, option_b, option_c, option_d,
  bible_reference,
  explanation,
  teaching_notes,
  tags,
  is_active,
  ready_for_prod  -- Defaults to FALSE
)
```

---

## Review & Quality Assurance

### Batch Review Screen

**Navigate:** Home → Batch Review

**Features:**
- **Card-based interface** - One question at a time, full details
- **Quick actions** - Approve ✅, Edit ✏️, Delete 🗑️, Skip ⏭️
- **Test question** - Try answering it yourself
- **Filters** - By difficulty, flagged status, category

**Workflow:**
1. Review question text, options, answer
2. Check Bible reference and explanation quality
3. Read teaching notes for theological accuracy
4. Take action:
   - **Approve** → Flags for production migration
   - **Edit** → Opens Question Review screen for that question
   - **Delete** → Permanently removes from dev (confirmation required)
   - **Skip** → Move to next question

**Progress Tracking:**
- Shows "X of Y questions"
- Smooth animations between questions

### Question Review Screen (List View)

**Navigate:** Home → Question List

**Features:**
- **Full question list** with all details
- **Filters** - Difficulty, active/inactive, category
- **Statistics** - Total, active, inactive counts
- **Individual actions** per question:
  - Toggle active/inactive
  - Flag for production
  - Unflag
  - Migrate immediately
  - Delete

**When to Use:**
- Searching for specific questions
- Bulk overview of all questions
- Finding questions with missing references/explanations

### Question Statistics Dashboard

**Navigate:** Home → Statistics

**Metrics Displayed:**

**Overview:**
- Total questions (dev or prod)
- Active vs inactive count

**By Difficulty:**
- Visual breakdown of beginner/intermediate/expert/scholar
- Percentage distribution

**By Category:**
- Count per category
- Helps identify gaps in content

**Quality Metrics (Dev Only):**
- Average completeness score (0-100%)
- Questions with explanations
- Questions with Bible references
- Questions with teaching notes
- Questions with tags

**Migration Readiness (Dev Only):**
- Total flagged for production
- Ready to migrate (✅ no errors)
- Has warnings only (⚠️)
- Has errors (❌)
- View error details
- Batch migrate button

**Completeness Score:**
- Each question scored 0-100%
- 25% for explanation
- 25% for Bible reference
- 25% for teaching notes
- 25% for tags

---

## Migration to Production

### Flagging Questions for Migration

**What "Flagging" Does:**
- Sets `ready_for_prod = true` in `questions_dev`
- Question enters migration queue
- Can be unflagged if issues found

**How to Flag:**
1. **Batch Review** → Approve button (recommended for speed)
2. **Question Review** → Individual "Flag for Prod" button

### Pre-Migration Validation

Before migration, the system checks:

**Critical Errors (Will Block Migration):**
- Question text is empty
- Correct answer is missing
- Category doesn't exist in production
- Duplicate question text in production
- Multiple choice has < 2 options
- Correct answer doesn't match any option

**Warnings (Won't Block, But Should Address):**
- Missing explanation
- Missing Bible reference
- Scholar difficulty without teaching notes
- No tags
- Question text too short (< 10 chars) or too long (> 500 chars)

### Viewing Migration Status

**Navigate:** Home → Statistics → Migration Readiness section

Shows:
- How many questions are flagged
- How many pass validation
- How many have errors
- Click "View Errors" to see what needs fixing

### Batch Migration

**Steps:**

1. **Review Statistics Dashboard**
   - Ensure "Ready to Migrate" count is > 0
   - Check "Has Errors" count (fix errors first)

2. **Click "Migrate X Question(s)" Button**
   - Confirmation dialog shows count and warnings
   - System will skip questions with errors

3. **Migration Process (For Each Question):**
   ```sql
   -- Step 1: Get question from dev with category info
   SELECT * FROM questions_dev
   JOIN categories_dev ON category_id
   WHERE id = question_id;

   -- Step 2: Find matching production category by name
   SELECT id FROM categories
   WHERE name = dev_category.name;

   -- Step 3: Check for duplicates
   SELECT id FROM questions
   WHERE question_text = dev_question.question_text;

   -- Step 4: If all checks pass, insert into production
   INSERT INTO questions (
     category_id, -- Mapped to prod category
     difficulty,
     question_type,
     question_text,
     correct_answer,
     option_a, option_b, option_c, option_d,
     bible_reference,
     explanation,
     teaching_notes,
     tags,
     is_active
   ) VALUES (...);

   -- Step 5: Unflag the dev question
   UPDATE questions_dev
   SET ready_for_prod = false
   WHERE id = question_id;
   ```

4. **Result:**
   - Success message shows count migrated
   - Flagged questions in dev are automatically unflagged
   - Production questions are immediately available to users

### Individual Question Migration

**Alternative to batch migration:**

1. **Question Review** → Click "Migrate Now" on individual question
2. Same validation and migration process
3. Useful for testing migration or urgent single-question updates

---

## Best Practices

### Content Quality Standards

**Every Question Should:**
- ✅ Have a clear, specific question text
- ✅ Include a Bible reference
- ✅ Include an explanation (especially for higher difficulties)
- ✅ Be tagged with relevant themes/books/concepts
- ✅ Be accurate to Scripture
- ✅ Teach something, not just test recall

**Teaching Notes Guidelines:**
- Use for scholar difficulty questions
- Include theological significance
- Add cross-references to related passages
- Explain historical/cultural context
- Connect to broader biblical themes

**Tag Examples:**
- **Biblical Books:** "Genesis", "Exodus", "Matthew", "Romans"
- **Themes:** "Covenant", "Redemption", "Faith", "Obedience"
- **Periods:** "Patriarchs", "Judges", "Kingdom Era", "Exile"
- **Types:** "Prophecy Fulfilled", "Typology", "Wisdom", "Law"

### Efficient Workflow

**For Creating 10-20 Questions in One Session:**

1. **Setup:**
   - Switch to Development mode
   - Open Create Question screen
   - Select category and difficulty (will persist)

2. **Rapid Entry Loop:**
   - Fill in question details
   - Click "Preview" to verify
   - Click "Create Question"
   - Select "Create Another"
   - Repeat

3. **Batch Review:**
   - Open Batch Review screen
   - Set filter to unflagged questions
   - Approve good questions (sets flag automatically)
   - Skip questionable ones for later editing

4. **Quality Check:**
   - Open Statistics dashboard
   - Check completeness score
   - Aim for 75%+ before migrating

5. **Migrate:**
   - Review migration readiness
   - Fix any errors
   - Batch migrate approved questions

**Time Estimate:**
- Create question: ~1-2 minutes each (with teaching notes)
- Review question: ~10-15 seconds each (batch review)
- Migration: ~5 seconds for batch

**Goal: 10 questions in 15 minutes is achievable!**

### Category Management

**Creating New Categories:**

Categories must be created manually in the database (for now). When creating a category, include educational metadata:

```sql
INSERT INTO categories_dev (
  name,
  description,
  theme,
  biblical_period,
  learning_objective,
  difficulty_range,
  sort_order
) VALUES (
  'Parables of Jesus',
  'Questions about the parables Jesus taught',
  'Teaching Methods',
  'Gospels',
  'Understand the meaning and application of Jesus'' parables and the Kingdom truths they reveal.',
  'intermediate-expert',
  10
);
```

**Before migrating questions in a new category:**
1. Create matching category in production:
   ```sql
   INSERT INTO categories (name, description, theme, biblical_period, learning_objective, difficulty_range, sort_order)
   SELECT name, description, theme, biblical_period, learning_objective, difficulty_range, sort_order
   FROM categories_dev
   WHERE name = 'Parables of Jesus';
   ```
2. Verify category exists in both dev and prod
3. Then migrate questions

---

## Troubleshooting

### Common Issues

#### "Category doesn't exist in production"

**Problem:** You flagged a question but its category hasn't been migrated yet.

**Solution:**
1. Note the category name from error message
2. Run SQL to migrate category:
   ```sql
   -- First check if category exists in dev
   SELECT * FROM categories_dev WHERE name = 'YourCategoryName';

   -- Insert into production
   INSERT INTO categories (name, description, theme, biblical_period, learning_objective, difficulty_range, sort_order)
   SELECT name, description, theme, biblical_period, learning_objective, difficulty_range, sort_order
   FROM categories_dev
   WHERE name = 'YourCategoryName';
   ```
3. Retry migration

#### "Question with identical text already exists in production"

**Problem:** You're trying to migrate a duplicate.

**Solution:**
- **If it's truly a duplicate:** Delete from dev
- **If it's an update:** Find the prod question ID and manually mark old one as inactive first

#### "Correct answer doesn't match any option"

**Problem:** Typo or whitespace mismatch between correct answer and options.

**Solution:**
1. Click "Edit" on the question
2. Copy the exact text from one of the options
3. Paste into "Correct Answer" field
4. Save and retry

#### Questions not showing in game

**Problem:** Questions in dev but not in production.

**Checklist:**
1. ✅ Are you in Development mode? (Switch to Production)
2. ✅ Have questions been migrated to production?
3. ✅ Are production questions marked as `is_active = true`?
4. ✅ Does the category exist in production?

#### Low completeness score

**Problem:** Dashboard shows < 50% completeness.

**Solution:**
1. Open Question Review screen
2. Filter by questions without explanations/references
3. Add missing content using Edit function
4. Aim for 100% completeness before migration

### Database Access

**Viewing Questions Directly:**

```sql
-- See all dev questions
SELECT
  q.question_text,
  c.name as category,
  q.difficulty,
  q.ready_for_prod,
  q.explanation IS NOT NULL as has_explanation,
  q.bible_reference IS NOT NULL as has_reference
FROM questions_dev q
JOIN categories_dev c ON q.category_id = c.id
ORDER BY q.created_at DESC;

-- See migration candidates
SELECT question_text, category_id, ready_for_prod
FROM questions_dev
WHERE ready_for_prod = true;
```

**Manual Migration (Emergency Use Only):**

```sql
-- Migrate single question
-- Get dev question
SELECT * FROM questions_dev WHERE id = 'question-uuid';

-- Get prod category ID
SELECT id FROM categories WHERE name = 'CategoryName';

-- Insert (replace with actual values)
INSERT INTO questions (category_id, difficulty, question_type, question_text, correct_answer, ...)
VALUES (...);
```

---

## Workflow Checklists

### New Content Creator Checklist

- [ ] Switch to Development mode
- [ ] Create 5 test questions in Create Question screen
- [ ] Review them in Batch Review screen
- [ ] Check Statistics dashboard
- [ ] Flag 2-3 questions for production
- [ ] View migration readiness
- [ ] (Don't actually migrate yet - practice first!)

### Pre-Deployment Checklist

Before migrating to production:

- [ ] All categories exist in both dev and prod
- [ ] Completeness score > 75%
- [ ] All scholar questions have teaching notes
- [ ] All questions have Bible references
- [ ] All questions have explanations
- [ ] Migration readiness shows 0 errors
- [ ] Tested questions in Batch Review
- [ ] Confirmed no duplicate questions

### Post-Migration Checklist

After migrating:

- [ ] Switch to Production mode
- [ ] View Statistics dashboard (confirm new questions added)
- [ ] Play a test game to verify questions appear
- [ ] Check that questions display correctly
- [ ] Switch back to Development mode

---

## Summary

**Question Lifecycle:**

1. **Create** in dev environment → Saved to `questions_dev`
2. **Review** using Batch Review or Question Review
3. **Flag** for production → Sets `ready_for_prod = true`
4. **Validate** using Statistics dashboard
5. **Migrate** to production → Copies to `questions` table
6. **Publish** → Immediately available to users

**Key Principles:**
- ✅ Dev is safe - experiment freely
- ✅ Production is protected - requires validation
- ✅ Quality over quantity - aim for educational value
- ✅ Always include context - references + explanations
- ✅ Test before migrating - use preview and batch review

**Questions?**
Refer to the in-app tooltips or check the Statistics dashboard for quality metrics and migration status.

---

**Happy Question Creating! 🎯📖**
