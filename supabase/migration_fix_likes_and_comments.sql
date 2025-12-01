-- Fix RLS policies for story_likes and story_comments to allow functionality
-- These tables need to work with the app's authentication flow

-- Story Likes: Update policies to allow authenticated users to like/unlike
DROP POLICY IF EXISTS "Users can like stories" ON story_likes;
CREATE POLICY "Users can like stories" ON story_likes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can remove their likes" ON story_likes;
CREATE POLICY "Users can remove their likes" ON story_likes
  FOR DELETE USING (true);

-- Story Comments: Update policies to allow authenticated users to comment
DROP POLICY IF EXISTS "Users can comment on stories" ON story_comments;
CREATE POLICY "Users can comment on stories" ON story_comments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their comments" ON story_comments;
CREATE POLICY "Users can delete their comments" ON story_comments
  FOR DELETE USING (true);

-- Reload the schema cache to ensure PostgREST picks up the changes
NOTIFY pgrst, 'reload schema';
