-- Add rules field to communities table for signup page display
ALTER TABLE communities ADD COLUMN IF NOT EXISTS rules TEXT;
