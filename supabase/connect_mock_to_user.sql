-- Optional: Connect all mock users as friends to your actual user account
-- Replace 'YOUR_USER_ID_HERE' with your actual user_id from the profiles table
-- You can find your user_id by running: SELECT user_id, name FROM profiles WHERE name = 'Your Name';

-- INSTRUCTIONS:
-- 1. First, get your user_id by running:
--    SELECT user_id, name FROM profiles ORDER BY created_at DESC LIMIT 10;
-- 2. Replace 'YOUR_USER_ID_HERE' below with your actual user_id
-- 3. Run this script

DO $$
DECLARE
  my_user_id TEXT := 'YOUR_USER_ID_HERE';  -- Replace this with your actual user_id
BEGIN
  -- Add all mock users as friends to your account
  INSERT INTO friendships (user_id, friend_id)
  VALUES
    (my_user_id, 'mock_user_001'),
    (my_user_id, 'mock_user_002'),
    (my_user_id, 'mock_user_003'),
    (my_user_id, 'mock_user_004'),
    (my_user_id, 'mock_user_005'),
    (my_user_id, 'mock_user_006'),
    (my_user_id, 'mock_user_007'),
    (my_user_id, 'mock_user_008'),
    (my_user_id, 'mock_user_009'),
    (my_user_id, 'mock_user_010'),
    
    -- Reciprocal friendships (mock users back to you)
    ('mock_user_001', my_user_id),
    ('mock_user_002', my_user_id),
    ('mock_user_003', my_user_id),
    ('mock_user_004', my_user_id),
    ('mock_user_005', my_user_id),
    ('mock_user_006', my_user_id),
    ('mock_user_007', my_user_id),
    ('mock_user_008', my_user_id),
    ('mock_user_009', my_user_id),
    ('mock_user_010', my_user_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;
  
  RAISE NOTICE 'Successfully connected % with all mock users', my_user_id;
END $$;

-- Verify friendships
SELECT 
  p.name as "Your Friends",
  p.tagline
FROM friendships f
JOIN profiles p ON p.user_id = f.friend_id
WHERE f.user_id = 'YOUR_USER_ID_HERE'  -- Replace this too
  AND p.user_id LIKE 'mock_user_%'
ORDER BY p.name;
