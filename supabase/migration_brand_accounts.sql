-- Brand Accounts Migration
-- Adds support for brand accounts with Canon and Seed posting modes

-- ============================================================================
-- PROFILES TABLE EXTENSIONS
-- ============================================================================

-- Add brand-related fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_brand BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS brand_website TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS brand_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS brand_verified_at TIMESTAMPTZ;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS brand_subscription_status TEXT DEFAULT 'none';

-- Add check constraint for brand_subscription_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_brand_subscription_status'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT check_brand_subscription_status 
      CHECK (brand_subscription_status IN ('none', 'active', 'expired'));
  END IF;
END $$;

-- Create index for brand lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_brand ON profiles(is_brand) WHERE is_brand = TRUE;

-- ============================================================================
-- STORIES TABLE EXTENSIONS
-- ============================================================================

-- Add post_type for Canon/Seed differentiation
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'normal';

-- Add check constraint for post_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_post_type'
  ) THEN
    ALTER TABLE stories
      ADD CONSTRAINT check_post_type 
      CHECK (post_type IN ('normal', 'canon', 'seed'));
  END IF;
END $$;

-- Add canon_slots array to track immutable slot indices (0-indexed)
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS canon_slots INTEGER[] DEFAULT '{}';

-- Add brand_id to link stories to brand accounts
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS brand_id TEXT;

-- Add foreign key constraint for brand_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stories_brand_id_fkey'
  ) THEN
    ALTER TABLE stories
      ADD CONSTRAINT stories_brand_id_fkey 
      FOREIGN KEY (brand_id) REFERENCES profiles(user_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_stories_post_type ON stories(post_type);
CREATE INDEX IF NOT EXISTS idx_stories_brand_id ON stories(brand_id) WHERE brand_id IS NOT NULL;

-- ============================================================================
-- HELPER FUNCTION: Check if a slot is immutable
-- ============================================================================

CREATE OR REPLACE FUNCTION is_slot_immutable(
  p_story_id UUID,
  p_slot_index INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_post_type TEXT;
  v_canon_slots INTEGER[];
BEGIN
  SELECT post_type, canon_slots INTO v_post_type, v_canon_slots
  FROM stories WHERE id = p_story_id;
  
  IF v_post_type = 'seed' AND p_slot_index = 0 THEN
    RETURN TRUE;
  END IF;
  
  IF v_post_type = 'canon' AND p_slot_index = ANY(v_canon_slots) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Prevent modifications to immutable slots
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_immutable_slot_modification()
RETURNS TRIGGER AS $$
DECLARE
  contribution_position INTEGER;
  is_immutable BOOLEAN;
BEGIN
  -- For DELETE operations, check if the contribution is in an immutable slot
  IF TG_OP = 'DELETE' THEN
    -- Get the position of this contribution (0-indexed based on timestamp order)
    SELECT COUNT(*) INTO contribution_position
    FROM contributions
    WHERE story_id = OLD.story_id AND timestamp < OLD.timestamp;
    
    is_immutable := is_slot_immutable(OLD.story_id, contribution_position);
    
    IF is_immutable THEN
      RAISE EXCEPTION 'Cannot delete contribution in an immutable slot';
    END IF;
  END IF;
  
  -- For UPDATE operations, prevent content changes on immutable slots
  IF TG_OP = 'UPDATE' THEN
    SELECT COUNT(*) INTO contribution_position
    FROM contributions
    WHERE story_id = OLD.story_id AND timestamp < OLD.timestamp;
    
    is_immutable := is_slot_immutable(OLD.story_id, contribution_position);
    
    IF is_immutable AND (
      OLD.content IS DISTINCT FROM NEW.content OR
      OLD.media_url IS DISTINCT FROM NEW.media_url OR
      OLD.media_type IS DISTINCT FROM NEW.media_type
    ) THEN
      RAISE EXCEPTION 'Cannot modify contribution in an immutable slot';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_immutable_slot_modification ON contributions;
CREATE TRIGGER prevent_immutable_slot_modification
  BEFORE UPDATE OR DELETE ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_immutable_slot_modification();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN profiles.is_brand IS 'Whether this account is a brand account';
COMMENT ON COLUMN profiles.brand_website IS 'Brand website URL for verification';
COMMENT ON COLUMN profiles.brand_verified IS 'Whether the brand has been verified';
COMMENT ON COLUMN profiles.brand_verified_at IS 'When the brand was verified';
COMMENT ON COLUMN profiles.brand_subscription_status IS 'Brand subscription status: none, active, or expired';

COMMENT ON COLUMN stories.post_type IS 'Type of post: normal, canon (multi-slot immutable), or seed (slot 1 immutable)';
COMMENT ON COLUMN stories.canon_slots IS 'Array of immutable slot indices for canon posts (0-indexed)';
COMMENT ON COLUMN stories.brand_id IS 'Brand account ID if this is a brand post';

COMMENT ON FUNCTION is_slot_immutable(UUID, INTEGER) IS 'Check if a specific slot in a story is immutable based on post_type and canon_slots';
