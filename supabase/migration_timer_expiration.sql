-- Migration to support timer expiration and turn skipping features
-- Adds notification types for timer-related events

-- Check if timer_expired notification type needs to be added
-- (This is informational - notification types may be flexible in your schema)

-- Add comment for documentation
COMMENT ON COLUMN stories.turn_timer_hours IS 'Number of hours each participant has to complete their turn. NULL means no time limit. When expired, turn automatically skips to next participant.';

-- Create index for efficient timer expiration queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_stories_active_with_timer 
ON stories(status, turn_timer_hours, current_turn_user_id) 
WHERE status = 'active' AND turn_timer_hours IS NOT NULL AND current_turn_user_id IS NOT NULL;

-- This index helps the edge function quickly find stories that need timer checks
