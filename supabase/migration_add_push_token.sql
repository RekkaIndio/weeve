-- Add push_token column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create index on push_token for faster lookups (useful when sending notifications)
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token);
