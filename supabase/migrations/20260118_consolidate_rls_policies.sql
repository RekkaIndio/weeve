-- Migration to consolidate multiple permissive RLS policies into single policies per action/role
-- Fixes "Multiple Permissive Policies" performance lints

BEGIN;

--------------------------------------------------------------------------------
-- 1. public.contributions (DELETE)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete any contribution" ON public.contributions;
DROP POLICY IF EXISTS "Users or story creators can remove contributions" ON public.contributions;

CREATE POLICY "Consolidated delete policy for contributions"
ON public.contributions
FOR DELETE
TO authenticated
USING (
  is_admin() 
  OR (auth.uid()::text = user_id) 
  OR (EXISTS (
    SELECT 1 
    FROM stories 
    WHERE stories.id = contributions.story_id 
      AND stories.creator_id = auth.uid()::text
  ))
);


--------------------------------------------------------------------------------
-- 2. public.group_members (DELETE)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete any group member" ON public.group_members;
DROP POLICY IF EXISTS "Members can leave or admins can remove" ON public.group_members;

CREATE POLICY "Consolidated delete policy for group_members"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  is_admin() 
  OR (user_id = auth.uid()::text) 
  OR (EXISTS (
    SELECT 1 
    FROM group_members gm 
    WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid()::text 
      AND gm.role = 'admin'::text
  ))
);


--------------------------------------------------------------------------------
-- 3. public.groups (DELETE)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete any group" ON public.groups;
DROP POLICY IF EXISTS "Groups can be deleted by owner" ON public.groups;

CREATE POLICY "Consolidated delete policy for groups"
ON public.groups
FOR DELETE
TO authenticated
USING (
  is_admin() 
  OR (owner_id = auth.uid()::text)
);


--------------------------------------------------------------------------------
-- 4. public.profiles (UPDATE)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Consolidated update policy for profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_admin() 
  OR (id = auth.uid()) -- Fixed: id is uuid, so compare with auth.uid() directly
);


--------------------------------------------------------------------------------
-- 5. public.stories (DELETE)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete any story" ON public.stories;
DROP POLICY IF EXISTS "Creators can delete their stories" ON public.stories;

CREATE POLICY "Consolidated delete policy for stories"
ON public.stories
FOR DELETE
TO authenticated
USING (
  is_admin() 
  OR (creator_id = auth.uid()::text)
);


--------------------------------------------------------------------------------
-- 6. public.stories (UPDATE)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can update any story" ON public.stories;
DROP POLICY IF EXISTS "Creators and participants can update stories" ON public.stories;

CREATE POLICY "Consolidated update policy for stories"
ON public.stories
FOR UPDATE
TO authenticated
USING (
  is_admin() 
  OR (creator_id = auth.uid()::text) 
  OR (EXISTS (
    SELECT 1 
    FROM contributions 
    WHERE contributions.story_id = stories.id 
      AND contributions.user_id = auth.uid()::text
  ))
);


--------------------------------------------------------------------------------
-- 7. public.story_comments (DELETE)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.story_comments;
DROP POLICY IF EXISTS "Users can delete their comments" ON public.story_comments;

CREATE POLICY "Consolidated delete policy for story_comments"
ON public.story_comments
FOR DELETE
TO authenticated
USING (
  is_admin() 
  OR (auth.uid()::text = user_id)
);


--------------------------------------------------------------------------------
-- 8. public.story_reports (DELETE)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete all reports" ON public.story_reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.story_reports;

CREATE POLICY "Consolidated delete policy for story_reports"
ON public.story_reports
FOR DELETE
TO authenticated
USING (
  is_admin() 
  OR (reporter_id = auth.uid())
);


--------------------------------------------------------------------------------
-- 9. public.story_reports (SELECT)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all reports" ON public.story_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.story_reports;

CREATE POLICY "Consolidated select policy for story_reports"
ON public.story_reports
FOR SELECT
TO authenticated
USING (
  is_admin() 
  OR (reporter_id = auth.uid())
);


COMMIT;
