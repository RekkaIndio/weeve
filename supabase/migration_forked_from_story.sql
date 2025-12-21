-- Migration: Add forked_from_story_id to stories table
-- Allows forked stories to reference their original story

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS forked_from_story_id UUID REFERENCES stories(id) ON DELETE SET NULL;

-- Create index for efficient lookups of forks
CREATE INDEX IF NOT EXISTS idx_stories_forked_from ON stories(forked_from_story_id) WHERE forked_from_story_id IS NOT NULL;
