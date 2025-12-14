-- Migration: Allow duplicate participants per story (remove unique constraint on story_id,user_id)
-- Date: 2025-12-13

-- This migration drops the unique constraint on (story_id, user_id) for the story_participants
-- table so the same user may be present multiple times in a single story (different slot positions).

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'story_participants'
    AND c.contype = 'u'
    AND array_to_string(ARRAY(SELECT attname FROM pg_attribute a WHERE a.attrelid = t.oid AND a.attnum = ANY(c.conkey)), ',') = 'story_id,user_id';

  IF constraint_name IS NOT NULL THEN
    RAISE NOTICE 'Dropping constraint %', constraint_name;
    EXECUTE format('ALTER TABLE story_participants DROP CONSTRAINT %I', constraint_name);
  ELSE
    RAISE NOTICE 'No unique constraint found on story_participants(story_id,user_id)';
  END IF;
END $$;

-- Ensure a non-unique index exists for performance on (story_id, user_id)
CREATE INDEX IF NOT EXISTS idx_story_participants_story_id_user_id ON story_participants (story_id, user_id);
