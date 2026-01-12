/**
 * CSV Question Import Script
 * 
 * Imports questions from CSV file into dev tables
 * 
 * Usage:
 *   node scripts/import-questions-from-csv.js bible-questions-characters.csv
 * 
 * Environment variables required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_KEY - Your Supabase service role key (for admin access)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Try to load .env file if it exists
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, that's ok
}

// Get Supabase credentials
// IMPORTANT: For import scripts, use SERVICE_ROLE_KEY (bypasses RLS)
// You can find this in Supabase Dashboard > Settings > API > service_role key
// Priority: SUPABASE_SERVICE_KEY > SUPABASE_ANON_KEY (fallback)
const supabaseUrl = process.env.SUPABASE_URL || 
                     process.env.EXPO_PUBLIC_SUPABASE_URL || 
                     'https://wdprqnjcfzuamzhtgiog.supabase.co';

// Try service role key first (bypasses RLS - needed for imports)
let supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Fallback to anon key if service key not provided (will need relaxed RLS)
if (!supabaseKey) {
  console.warn('⚠️  WARNING: SUPABASE_SERVICE_KEY not found. Using anon key.');
  console.warn('   Import may fail due to RLS policies.');
  console.warn('   Get your service_role key from: Supabase Dashboard > Settings > API');
  console.warn('   Or update RLS policies to allow unauthenticated inserts on dev tables.\n');
  supabaseKey = process.env.SUPABASE_ANON_KEY || 
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcHJxbmpjZnp1YW16aHRnaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTEzNzcsImV4cCI6MjA4MTEyNzM3N30.nQaXnfqCYsYFzZcBDovtQDIZc1rLL2J810TONPUxko0';
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in environment variables');
  console.error('   Or create a .env file with these values');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Parse CSV file (simple parser - handles quoted fields)
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return [];
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());
  return result;
}

/**
 * Get or create category in dev table
 */
async function getOrCreateCategory(categoryName, description = null) {
  // First, try to find existing category
  const { data: existing, error: fetchError } = await supabase
    .from('categories_dev')
    .select('id')
    .eq('name', categoryName)
    .single();

  if (existing) {
    return { id: existing.id, created: false };
  }

  // Create new category
  const { data: newCategory, error: createError } = await supabase
    .from('categories_dev')
    .insert({
      name: categoryName,
      description: description || `Questions about ${categoryName.toLowerCase()}`,
      sort_order: 0,
    })
    .select('id')
    .single();

  if (createError) {
    throw new Error(`Failed to create category "${categoryName}": ${createError.message}`);
  }

  return { id: newCategory.id, created: true };
}

/**
 * Import questions from CSV
 */
async function importQuestions(csvFilePath) {
  console.log('📖 Starting CSV import...\n');

  // Read CSV file
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Error: File not found: ${csvFilePath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    console.error('❌ Error: No data found in CSV file');
    process.exit(1);
  }

  console.log(`📊 Found ${rows.length} questions in CSV\n`);

  // Track statistics
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails = [];

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 because CSV is 1-indexed and has header

    try {
      // Validate required fields
      if (!row.Category || !row.Difficulty || !row.Question || !row.Correct_Answer) {
        console.warn(`⚠️  Row ${rowNum}: Missing required fields, skipping`);
        skipped++;
        continue;
      }

      // Get or create category
      const category = await getOrCreateCategory(
        row.Category,
        `Questions about ${row.Category.toLowerCase()}`
      );

      if (category.created) {
        console.log(`✅ Created category: ${row.Category}`);
      }

      // Check if question already exists (by question text)
      const { data: existing } = await supabase
        .from('questions_dev')
        .select('id')
        .eq('question_text', row.Question)
        .single();

      if (existing) {
        console.log(`⏭️  Row ${rowNum}: Question already exists, skipping`);
        skipped++;
        continue;
      }

      // Prepare question data
      const questionData = {
        category_id: category.id,
        difficulty: row.Difficulty.toLowerCase(),
        question_type: 'multiple_choice', // All CSV questions appear to be multiple choice
        question_text: row.Question.trim(),
        correct_answer: row.Correct_Answer.trim(),
        option_a: row.Option_A?.trim() || null,
        option_b: row.Option_B?.trim() || null,
        option_c: row.Option_C?.trim() || null,
        option_d: row.Option_D?.trim() || null,
        bible_reference: row.Scripture_Reference?.trim() || null,
        explanation: row.Explanation?.trim() || null,
        is_active: true,
      };

      // Insert question
      const { data: question, error: insertError } = await supabase
        .from('questions_dev')
        .insert(questionData)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      imported++;
      if (imported % 10 === 0) {
        console.log(`   Imported ${imported} questions...`);
      }
    } catch (error) {
      errors++;
      const errorMsg = `Row ${rowNum}: ${error.message}`;
      errorDetails.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Summary');
  console.log('='.repeat(50));
  console.log(`✅ Successfully imported: ${imported}`);
  console.log(`⏭️  Skipped (duplicates): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);

  if (errorDetails.length > 0) {
    console.log('\n❌ Error Details:');
    errorDetails.forEach(err => console.log(`   ${err}`));
  }

  console.log('\n✨ Import complete!');
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Switch to dev mode in your app`);
  console.log(`   2. Review questions in the app`);
  console.log(`   3. Use migration service to promote approved questions to production`);
}

// Main execution
const csvFile = process.argv[2] || 'bible-questions-characters.csv';
const csvPath = path.isAbsolute(csvFile) ? csvFile : path.join(process.cwd(), csvFile);

importQuestions(csvPath)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });




