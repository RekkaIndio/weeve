-- Add tagline column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN profiles.tagline IS 'User bio/tagline displayed on their profile';
