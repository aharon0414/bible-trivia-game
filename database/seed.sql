-- Insert categories
INSERT INTO categories (name, description, icon_name, sort_order) VALUES
('Characters', 'Questions about people in the Bible', 'person', 1),
('Events', 'Major events and stories from Scripture', 'calendar', 2),
('Locations', 'Places mentioned in the Bible', 'map-pin', 3),
('Parables', 'Jesus parables and their meanings', 'book-open', 4),
('Themes', 'Major theological themes throughout Scripture', 'lightbulb', 5),
('Theology/Doctrine', 'Questions about Christian beliefs and doctrine', 'graduation-cap', 6),
('Guess that Quote', 'Identify the exact Bible verse (NIV)', 'quote', 7),
('Church History', 'Early Church through today', 'church', 8);

-- Sample questions
INSERT INTO questions (category_id, difficulty, question_type, question_text, correct_answer, option_a, option_b, option_c, option_d, bible_reference)
SELECT 
    id, 'beginner', 'multiple_choice', 'Who built the ark to survive the great flood?', 'Noah', 'Noah', 'Moses', 'Abraham', 'David', 'Genesis 6-9'
FROM categories WHERE name = 'Characters';

INSERT INTO questions (category_id, difficulty, question_type, question_text, correct_answer, option_a, option_b, option_c, option_d, bible_reference)
SELECT 
    id, 'beginner', 'true_false', 'Jesus was born in Bethlehem.', 'true', 'true', 'false', NULL, NULL, 'Matthew 2:1'  
FROM categories WHERE name = 'Events';
