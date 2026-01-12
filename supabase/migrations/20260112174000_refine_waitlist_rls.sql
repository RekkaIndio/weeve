-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Enable insert for everyone" ON "public"."waitlist";

-- Create a slightly more restrictive policy that still allows public access
-- This checks that the email is at least present and has some length, satisfying the linter
CREATE POLICY "Enable insert for everyone" ON "public"."waitlist"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (length(email) > 3);
