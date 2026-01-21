BEGIN;

-- 1. Fix auth_rls_initplan for public.contributions (DELETE)
DROP POLICY IF EXISTS "Consolidated delete policy for contributions" ON public.contributions;
CREATE POLICY "Consolidated delete policy for contributions"
ON public.contributions
FOR DELETE
TO authenticated
USING (
  (select is_admin())
  OR ((select auth.uid())::text = user_id)
  OR (EXISTS (
    SELECT 1
    FROM stories
    WHERE stories.id = contributions.story_id
      AND stories.creator_id = (select auth.uid())::text
  ))
);

-- 2. Fix auth_rls_initplan for public.groups (DELETE)
DROP POLICY IF EXISTS "Consolidated delete policy for groups" ON public.groups;
CREATE POLICY "Consolidated delete policy for groups"
ON public.groups
FOR DELETE
TO authenticated
USING (
  (select is_admin())
  OR (owner_id = (select auth.uid())::text)
);

-- 3. Fix auth_rls_initplan for public.group_members (DELETE)
DROP POLICY IF EXISTS "Consolidated delete policy for group_members" ON public.group_members;
CREATE POLICY "Consolidated delete policy for group_members"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  (select is_admin())
  OR (user_id = (select auth.uid())::text)
  OR (EXISTS (
    SELECT 1
    FROM group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = (select auth.uid())::text
      AND gm.role = 'admin'::text
  ))
);

-- 4. Fix auth_rls_initplan for public.profiles (UPDATE)
DROP POLICY IF EXISTS "Consolidated update policy for profiles" ON public.profiles;
CREATE POLICY "Consolidated update policy for profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (select is_admin())
  OR (id = (select auth.uid()))
);

-- 5. Fix auth_rls_initplan for public.stories (DELETE)
DROP POLICY IF EXISTS "Consolidated delete policy for stories" ON public.stories;
CREATE POLICY "Consolidated delete policy for stories"
ON public.stories
FOR DELETE
TO authenticated
USING (
  (select is_admin())
  OR (creator_id = (select auth.uid())::text)
);

-- 6. Fix auth_rls_initplan for public.stories (UPDATE)
DROP POLICY IF EXISTS "Consolidated update policy for stories" ON public.stories;
CREATE POLICY "Consolidated update policy for stories"
ON public.stories
FOR UPDATE
TO authenticated
USING (
  (select is_admin())
  OR (creator_id = (select auth.uid())::text)
  OR (EXISTS (
    SELECT 1
    FROM contributions
    WHERE contributions.story_id = stories.id
      AND contributions.user_id = (select auth.uid())::text
  ))
);

-- 7. Fix auth_rls_initplan for public.story_comments (DELETE)
DROP POLICY IF EXISTS "Consolidated delete policy for story_comments" ON public.story_comments;
CREATE POLICY "Consolidated delete policy for story_comments"
ON public.story_comments
FOR DELETE
TO authenticated
USING (
  (select is_admin())
  OR ((select auth.uid())::text = user_id)
);

-- 8. Fix auth_rls_initplan for public.story_reports (DELETE)
DROP POLICY IF EXISTS "Consolidated delete policy for story_reports" ON public.story_reports;
CREATE POLICY "Consolidated delete policy for story_reports"
ON public.story_reports
FOR DELETE
TO authenticated
USING (
  (select is_admin())
  OR (reporter_id = (select auth.uid()))
);

-- 9. Fix auth_rls_initplan for public.story_reports (SELECT)
DROP POLICY IF EXISTS "Consolidated select policy for story_reports" ON public.story_reports;
CREATE POLICY "Consolidated select policy for story_reports"
ON public.story_reports
FOR SELECT
TO authenticated
USING (
  (select is_admin())
  OR (reporter_id = (select auth.uid()))
);

-- 10. Remove duplicate index on stories
DROP INDEX IF EXISTS stories_forked_from_story_id_idx;

COMMIT;
