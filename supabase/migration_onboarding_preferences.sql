-- Migration: Add onboarding and preferences fields to profiles table
-- Description: Adds fields to track user onboarding progress and content preferences

-- Add onboarding tracking columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS completed_onboarding BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain preferences structure
COMMENT ON COLUMN profiles.preferences IS 'User preferences stored as JSON: {categories: string[], story_length: string, content_style: string}';

-- Create index on completed_onboarding for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_completed_onboarding ON profiles(completed_onboarding);
