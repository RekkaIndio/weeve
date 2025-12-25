-- Brand Payment Status Migration
-- Adds payment tracking for brand posts

-- ============================================================================
-- ADD PAYMENT_STATUS COLUMN
-- ============================================================================

-- Add payment_status column to stories table
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS payment_status TEXT 
CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')) 
DEFAULT 'completed';

-- Create index for querying stories by payment status
CREATE INDEX IF NOT EXISTS idx_stories_payment_status ON stories(payment_status);

-- ============================================================================
-- ADD PAYMENT METADATA COLUMNS
-- ============================================================================

-- Optional: Add columns to track payment details
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMPTZ;

-- Create index for Stripe payment lookups
CREATE INDEX IF NOT EXISTS idx_stories_stripe_payment ON stories(stripe_payment_id);

-- ============================================================================
-- HELPER FUNCTION: Update Payment Status
-- ============================================================================

CREATE OR REPLACE FUNCTION update_story_payment_status(
  p_story_id UUID,
  p_status TEXT,
  p_stripe_payment_id TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE stories
  SET 
    payment_status = p_status,
    stripe_payment_id = COALESCE(p_stripe_payment_id, stripe_payment_id),
    payment_completed_at = CASE 
      WHEN p_status = 'completed' THEN NOW()
      ELSE payment_completed_at
    END,
    updated_at = NOW()
  WHERE id = p_story_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN stories.payment_status IS 'Payment status for brand posts: pending, completed, failed, or cancelled';
COMMENT ON COLUMN stories.stripe_payment_id IS 'Stripe payment/checkout session ID for tracking';
COMMENT ON COLUMN stories.payment_completed_at IS 'Timestamp when payment was completed';
COMMENT ON FUNCTION update_story_payment_status(UUID, TEXT, TEXT) IS 'Update payment status and metadata for a story';
