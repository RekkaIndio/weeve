-- Fix RLS policies for story_likes and story_comments
-- These tables need to work with custom authentication (not Supabase Auth)

-- Story Likes: Update policies to not require auth.uid()
DROP POLICY IF EXISTS "Users can like stories" ON story_likes;
CREATE POLICY "Users can like stories" ON story_likes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can remove their likes" ON story_likes;
CREATE POLICY "Users can remove their likes" ON story_likes
  FOR DELETE USING (true);

-- Story Comments: Update policies to not require auth.uid()
DROP POLICY IF EXISTS "Users can comment on stories" ON story_comments;
CREATE POLICY "Users can comment on stories" ON story_comments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their comments" ON story_comments;
CREATE POLICY "Users can delete their comments" ON story_comments
  FOR DELETE USING (true);
