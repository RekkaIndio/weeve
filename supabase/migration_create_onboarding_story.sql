-- Create the onboarding "Welcome to Weeve" story
-- This is a 3-part tutorial story that teaches users how to "stitch" stories together

-- Step 1: Create a system user for tutorial content
-- This user will "own" all tutorial contributions so they're not tied to any real user
INSERT INTO profiles (
    user_id,
    name,
    avatar,
    invite_code,
    tokens
)
VALUES (
    '00000000-0000-0000-0000-000000000000', -- Special system user UUID
    'Weeve Tutorial',
    'https://api.dicebear.com/7.x/bottts/svg?seed=weevetutorial', -- Bot avatar
    'TUTORIAL',
    0
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Create the story
INSERT INTO stories (
    id,
    title,
    description,
    creator_id,
    mode,
    visibility,
    status,
    max_weeves,
    cover_image,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Welcome to Weeve',
    'Your first Weeve story! Watch someone go from serious to smiling. Add the before (serious face) and after (big smile) to complete this 3-part story.',
    '00000000-0000-0000-0000-000000000000', -- System user is the creator
    'open',
    'public',
    'active',
    3, -- Only allow 3 contributions (beginning, middle, end)
    'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Add the pre-filled middle contribution (Part 2) - VIDEO ONLY, NO TEXT
-- This is a video of someone going from serious to laughing
INSERT INTO contributions (
    story_id,
    user_id,
    user_name,
    content,
    media_type,
    media_url,
    timestamp,
    created_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000', -- System user
    'Weeve Tutorial',
    '', -- Empty content - this is video-only
    'video',
    'https://fvyhyexdndynoonkzwbd.supabase.co/storage/v1/object/public/story-media/intro-laugh.mp4',
    1, -- Timestamp 1 = middle position
    NOW()
)
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE stories IS 'Stories table includes special onboarding tutorial story (id: 00000000-0000-0000-0000-000000000001) that teaches users how to stitch stories';
