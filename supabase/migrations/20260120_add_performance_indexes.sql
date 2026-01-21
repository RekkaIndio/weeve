-- Add indexes on foreign keys to improve performance of joins in the feed and other queries

-- contributions
CREATE INDEX IF NOT EXISTS idx_contributions_story_id ON public.contributions(story_id);

-- story_participants
CREATE INDEX IF NOT EXISTS idx_story_participants_story_id ON public.story_participants(story_id);

-- story_likes
CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON public.story_likes(story_id);

-- story_comments
CREATE INDEX IF NOT EXISTS idx_story_comments_story_id ON public.story_comments(story_id);

-- stories
CREATE INDEX IF NOT EXISTS idx_stories_group_id ON public.stories(group_id);
CREATE INDEX IF NOT EXISTS idx_stories_forked_from_story_id ON public.stories(forked_from_story_id);

-- Ensure created_at index exists (it was in a previous migration but ensuring here doesn't hurt if we want to be sure)
-- CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at);
-- (Commented out as it's already in 20260114102600_add_stories_created_at_index.sql)
