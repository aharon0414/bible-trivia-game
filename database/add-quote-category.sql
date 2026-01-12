-- Update production category name to match categories_dev
-- The migration service looks for categories by name, so they must match exactly
-- Run this in your Supabase SQL Editor

-- Update the category name from "Guess that Quote" to "Quote" to match dev
UPDATE categories 
SET name = 'Quote'
WHERE name = 'Guess that Quote';

-- If the category doesn't exist at all, create it
INSERT INTO categories (name, description, sort_order, is_active)
VALUES (
  'Quote',
  'Identify the source of biblical quotes',
  7,
  TRUE
)
ON CONFLICT (name) DO NOTHING;

-- Verify the category exists with the correct name
SELECT id, name, description, sort_order, is_active 
FROM categories 
WHERE name = 'Quote';
