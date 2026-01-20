-- Fix profile update policy to use correct user_id column
-- Previous policy incorrectly compared profile.id (row UUID) with auth.uid(),
-- but the user's auth ID is stored in the user_id column (as text).

BEGIN;

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Consolidated update policy for profiles" ON public.profiles;

-- Recreate with correct condition
CREATE POLICY "Consolidated update policy for profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_admin() 
  OR (user_id = auth.uid()::text) 
);

COMMIT;
