-- Mock profiles for testing
-- This creates 10 diverse user profiles with unique user_ids, names, taglines, and other attributes
-- Run this SQL in your Supabase SQL Editor to populate mock data for testing

INSERT INTO profiles (user_id, name, avatar, tagline, tokens, is_private, is_influencer, interaction_cost)
VALUES
  -- 1. Creative Artist
  (
    'mock_user_001',
    'Alex Rivera',
    '/mock-avatars/alex_rivera.png',
    'Digital artist 🎨 | Creating stories one pixel at a time',
    250,
    false,
    false,
    null
  ),
  
  -- 2. Travel Blogger
  (
    'mock_user_002',
    'Maya Chen',
    '/mock-avatars/maya_chen.png',
    '✈️ Wanderlust | Sharing adventures from around the globe',
    180,
    false,
    true,
    5
  ),
  
  -- 3. Tech Enthusiast
  (
    'mock_user_003',
    'Jordan Smith',
    '/mock-avatars/jordan_smith.png',
    'Tech geek 💻 | Building the future, one line at a time',
    320,
    false,
    false,
    null
  ),
  
  -- 4. Fitness Coach
  (
    'mock_user_004',
    'Sam Taylor',
    '/mock-avatars/sam_taylor.png',
    '💪 Fitness coach | Your health is your wealth',
    150,
    false,
    true,
    10
  ),
  
  -- 5. Food Critic
  (
    'mock_user_005',
    'Priya Patel',
    '/mock-avatars/priya_patel.png',
    '🍜 Food enthusiast | Tasting the world one dish at a time',
    200,
    false,
    false,
    null
  ),
  
  -- 6. Music Producer
  (
    'mock_user_006',
    'Marcus Johnson',
    '/mock-avatars/marcus_johnson.png',
    '🎵 Music producer | Dropping beats and making memories',
    400,
    false,
    true,
    15
  ),
  
  -- 7. Book Lover
  (
    'mock_user_007',
    'Emma Wilson',
    '/mock-avatars/emma_wilson.png',
    '📚 Bookworm | Lost in stories, found in words',
    120,
    true,
    false,
    null
  ),
  
  -- 8. Nature Photographer
  (
    'mock_user_008',
    'Liam O''Connor',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=LiamOConnor',
    '📷 Nature photographer | Capturing Earth''s beauty',
    280,
    false,
    true,
    8
  ),
  
  -- 9. Gaming Streamer
  (
    'mock_user_009',
    'Zara Khan',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=ZaraKhan',
    '🎮 Pro gamer | Level up your life',
    500,
    false,
    true,
    20
  ),
  
  -- 10. Everyday User
  (
    'mock_user_010',
    'Casey Morgan',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=CaseyMorgan',
    'Just here to share stories and make friends ✨',
    100,
    false,
    false,
    null
  )
ON CONFLICT (user_id) DO NOTHING;

-- Create friendships between all mock users
-- This creates a fully connected network so all mock users are friends with each other
INSERT INTO friendships (user_id, friend_id)
VALUES
  -- Alex Rivera's friendships
  ('mock_user_001', 'mock_user_002'),
  ('mock_user_001', 'mock_user_003'),
  ('mock_user_001', 'mock_user_004'),
  ('mock_user_001', 'mock_user_005'),
  ('mock_user_001', 'mock_user_006'),
  ('mock_user_001', 'mock_user_007'),
  ('mock_user_001', 'mock_user_008'),
  ('mock_user_001', 'mock_user_009'),
  ('mock_user_001', 'mock_user_010'),
  
  -- Maya Chen's friendships
  ('mock_user_002', 'mock_user_001'),
  ('mock_user_002', 'mock_user_003'),
  ('mock_user_002', 'mock_user_004'),
  ('mock_user_002', 'mock_user_005'),
  ('mock_user_002', 'mock_user_006'),
  ('mock_user_002', 'mock_user_007'),
  ('mock_user_002', 'mock_user_008'),
  ('mock_user_002', 'mock_user_009'),
  ('mock_user_002', 'mock_user_010'),
  
  -- Jordan Smith's friendships
  ('mock_user_003', 'mock_user_001'),
  ('mock_user_003', 'mock_user_002'),
  ('mock_user_003', 'mock_user_004'),
  ('mock_user_003', 'mock_user_005'),
  ('mock_user_003', 'mock_user_006'),
  ('mock_user_003', 'mock_user_007'),
  ('mock_user_003', 'mock_user_008'),
  ('mock_user_003', 'mock_user_009'),
  ('mock_user_003', 'mock_user_010'),
  
  -- Sam Taylor's friendships
  ('mock_user_004', 'mock_user_001'),
  ('mock_user_004', 'mock_user_002'),
  ('mock_user_004', 'mock_user_003'),
  ('mock_user_004', 'mock_user_005'),
  ('mock_user_004', 'mock_user_006'),
  ('mock_user_004', 'mock_user_007'),
  ('mock_user_004', 'mock_user_008'),
  ('mock_user_004', 'mock_user_009'),
  ('mock_user_004', 'mock_user_010'),
  
  -- Priya Patel's friendships
  ('mock_user_005', 'mock_user_001'),
  ('mock_user_005', 'mock_user_002'),
  ('mock_user_005', 'mock_user_003'),
  ('mock_user_005', 'mock_user_004'),
  ('mock_user_005', 'mock_user_006'),
  ('mock_user_005', 'mock_user_007'),
  ('mock_user_005', 'mock_user_008'),
  ('mock_user_005', 'mock_user_009'),
  ('mock_user_005', 'mock_user_010'),
  
  -- Marcus Johnson's friendships
  ('mock_user_006', 'mock_user_001'),
  ('mock_user_006', 'mock_user_002'),
  ('mock_user_006', 'mock_user_003'),
  ('mock_user_006', 'mock_user_004'),
  ('mock_user_006', 'mock_user_005'),
  ('mock_user_006', 'mock_user_007'),
  ('mock_user_006', 'mock_user_008'),
  ('mock_user_006', 'mock_user_009'),
  ('mock_user_006', 'mock_user_010'),
  
  -- Emma Wilson's friendships
  ('mock_user_007', 'mock_user_001'),
  ('mock_user_007', 'mock_user_002'),
  ('mock_user_007', 'mock_user_003'),
  ('mock_user_007', 'mock_user_004'),
  ('mock_user_007', 'mock_user_005'),
  ('mock_user_007', 'mock_user_006'),
  ('mock_user_007', 'mock_user_008'),
  ('mock_user_007', 'mock_user_009'),
  ('mock_user_007', 'mock_user_010'),
  
  -- Liam O'Connor's friendships
  ('mock_user_008', 'mock_user_001'),
  ('mock_user_008', 'mock_user_002'),
  ('mock_user_008', 'mock_user_003'),
  ('mock_user_008', 'mock_user_004'),
  ('mock_user_008', 'mock_user_005'),
  ('mock_user_008', 'mock_user_006'),
  ('mock_user_008', 'mock_user_007'),
  ('mock_user_008', 'mock_user_009'),
  ('mock_user_008', 'mock_user_010'),
  
  -- Zara Khan's friendships
  ('mock_user_009', 'mock_user_001'),
  ('mock_user_009', 'mock_user_002'),
  ('mock_user_009', 'mock_user_003'),
  ('mock_user_009', 'mock_user_004'),
  ('mock_user_009', 'mock_user_005'),
  ('mock_user_009', 'mock_user_006'),
  ('mock_user_009', 'mock_user_007'),
  ('mock_user_009', 'mock_user_008'),
  ('mock_user_009', 'mock_user_010'),
  
  -- Casey Morgan's friendships
  ('mock_user_010', 'mock_user_001'),
  ('mock_user_010', 'mock_user_002'),
  ('mock_user_010', 'mock_user_003'),
  ('mock_user_010', 'mock_user_004'),
  ('mock_user_010', 'mock_user_005'),
  ('mock_user_010', 'mock_user_006'),
  ('mock_user_010', 'mock_user_007'),
  ('mock_user_010', 'mock_user_008'),
  ('mock_user_010', 'mock_user_009')
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- Display the newly created mock profiles
SELECT user_id, name, tagline, tokens, is_influencer
FROM profiles
WHERE user_id LIKE 'mock_user_%'
ORDER BY user_id;

-- Display friendship count
SELECT 
  'Total friendships created' as description,
  COUNT(*) as count
FROM friendships
WHERE user_id LIKE 'mock_user_%';
