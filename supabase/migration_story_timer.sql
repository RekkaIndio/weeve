-- Add turn timer field to stories table
-- This allows story creators to set a time limit for each participant's turn

-- Add turn_timer_hours column
ALTER TABLE stories ADD COLUMN turn_timer_hours integer DEFAULT NULL;

-- Add index for efficient queries on stories with timers
CREATE INDEX idx_stories_turn_timer ON stories(turn_timer_hours) WHERE turn_timer_hours IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN stories.turn_timer_hours IS 'Number of hours each participant has to complete their turn. NULL means no time limit.';
