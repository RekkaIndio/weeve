-- Migration: Add revolut_payment_id column to stories table
-- This column stores the Revolut payment order ID for brand posts

-- Add the revolut_payment_id column if it doesn't exist
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS revolut_payment_id TEXT;

-- Add an index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stories_revolut_payment_id 
ON stories(revolut_payment_id) 
WHERE revolut_payment_id IS NOT NULL;

-- Note: The stripe_payment_id column can be kept for historical data
-- or removed after confirming no pending Stripe transactions exist
