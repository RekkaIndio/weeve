-- Add missing columns to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS hashtags text[] DEFAULT null;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS allow_comments boolean DEFAULT true;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS allow_reuse boolean DEFAULT true;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS turn_timer_hours numeric DEFAULT null;

-- Reload the schema cache to ensure PostgREST picks up the changes
NOTIFY pgrst, 'reload schema';
