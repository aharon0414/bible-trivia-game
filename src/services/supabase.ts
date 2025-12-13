import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdprqnjcfzuamzhtgiog.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcHJxbmpjZnp1YW16aHRnaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTEzNzcsImV4cCI6MjA4MTEyNzM3N30.nQaXnfqCYsYFzZcBDovtQDIZc1rLL2J810TONPUxko0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
