-- Create a system user for onboarding tutorial content
-- Note: Individual onboarding stories are now created per-user via the app (see src/lib/onboarding.ts)
-- This migration only creates the system user that will add the pre-filled middle contribution

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

-- Step 2: DEPRECATED - The global onboarding story approach
-- Each user now gets their own personalized onboarding story created via src/lib/onboarding.ts
-- This ensures each user can complete the tutorial independently without interference
-- The createOnboardingStory() function creates a story titled "Your First Weeve Story" with max_weeves: 3
-- and adds a pre-filled middle contribution from the system user above

-- Add comment
COMMENT ON TABLE profiles IS 'Profiles table includes special system user (id: 00000000-0000-0000-0000-000000000000) for tutorial content';
