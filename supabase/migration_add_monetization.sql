-- Add monetization_cost column to stories table
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS monetization_cost INTEGER;

-- Add check constraint to ensure monetization_cost is non-negative
ALTER TABLE stories
  ADD CONSTRAINT check_monetization_cost_non_negative CHECK (monetization_cost >= 0);
