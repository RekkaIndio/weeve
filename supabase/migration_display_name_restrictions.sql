-- Add restrictions for display name changes
-- 1. Ensure display names are unique
-- 2. Allow name changes only every 14 days

-- Add last_name_change_at column to track when the name was last changed
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_name_change_at TIMESTAMPTZ DEFAULT NOW();

-- Make name column unique to prevent duplicate display names
-- First, handle any existing duplicates by appending user_id to duplicates
UPDATE profiles
SET name = name || '_' || user_id
WHERE name IN (
  SELECT name
  FROM profiles
  GROUP BY name
  HAVING COUNT(*) > 1
);

-- Add unique constraint on name
ALTER TABLE profiles
  ADD CONSTRAINT unique_display_name UNIQUE (name);

-- Update the RLS policy to include name change restrictions
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create a function to validate name changes
CREATE OR REPLACE FUNCTION validate_name_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If name is not changing, allow the update
  IF OLD.name = NEW.name THEN
    RETURN NEW;
  END IF;

  -- Check if new name already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE name = NEW.name AND user_id != NEW.user_id) THEN
    RAISE EXCEPTION 'Display name already exists';
  END IF;

  -- Check cooldown period (14 days)
  IF OLD.last_name_change_at IS NOT NULL AND NOW() - OLD.last_name_change_at < INTERVAL '14 days' THEN
    RAISE EXCEPTION 'Name can only be changed once every 14 days';
  END IF;

  -- Update the timestamp
  NEW.last_name_change_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate name changes before update
DROP TRIGGER IF EXISTS validate_name_change_trigger ON profiles;
CREATE TRIGGER validate_name_change_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_name_change();

-- Simplified RLS policy (validation is now in the trigger)
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);