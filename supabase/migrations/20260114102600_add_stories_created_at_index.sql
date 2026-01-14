-- Add index on stories(created_at) for performance optimization
-- Recommended by Supabase Query Performance analysis
-- Expected improvement: ~78% for queries sorting by created_at

CREATE INDEX IF NOT EXISTS idx_stories_created_at 
    ON public.stories USING btree (created_at);
