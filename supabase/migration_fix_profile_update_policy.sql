-- Fix the RLS policy for profile updates to properly check user ownership
-- The current policy allows anyone to update any profile, which should be restricted

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);
