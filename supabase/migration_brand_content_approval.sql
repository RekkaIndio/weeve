-- Brand Content Approval System Migration
-- Adds approval status tracking to contributions and stories for brand quality control

-- ============================================================================
-- CONTRIBUTIONS TABLE - Add approval status
-- ============================================================================

-- Add approval_status enum column to track approval state
ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';

-- Add check constraint for approval_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_contributions_approval_status'
  ) THEN
    ALTER TABLE contributions
      ADD CONSTRAINT check_contributions_approval_status 
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Add metadata for approval tracking
ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT REFERENCES profiles(user_id) ON DELETE SET NULL;

-- Create index for efficient querying of pending contributions
CREATE INDEX IF NOT EXISTS idx_contributions_approval_status 
  ON contributions(approval_status) 
  WHERE approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_contributions_story_approval 
  ON contributions(story_id, approval_status);

-- ============================================================================
-- STORIES TABLE - Add approval status for Canon posts
-- ============================================================================

-- Add approval_status for entire story (used primarily for Canon posts)
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';

-- Add check constraint for story approval_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_stories_approval_status'
  ) THEN
    ALTER TABLE stories
      ADD CONSTRAINT check_stories_approval_status 
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Add metadata for story-level approval tracking
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT REFERENCES profiles(user_id) ON DELETE SET NULL;

-- Create index for pending stories
CREATE INDEX IF NOT EXISTS idx_stories_approval_status 
  ON stories(approval_status) 
  WHERE approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_stories_brand_approval 
  ON stories(creator_id, approval_status) 
  WHERE approval_status = 'pending';

-- ============================================================================
-- NOTIFICATIONS - Extend type constraint for approval notifications
-- ============================================================================

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END $$;

-- Add new constraint with approval notification types
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'story_invite', 
      'story_turn', 
      'story_completed', 
      'story_liked', 
      'story_comment',
      'friend_request', 
      'friend_accepted',
      'group_invite',
      'group_join_request',
      'group_request_approved',
      'group_request_declined',
      'share',
      'content_submitted_for_review',      -- Brand notified of new submission
      'content_approved',                   -- Contributor notified of approval
      'content_rejected',                   -- Contributor notified of rejection
      'story_submitted_for_review',         -- Brand notified of completed Canon post
      'story_approved',                     -- Contributors notified of story approval
      'story_rejected'                      -- Contributors notified of story rejection
    )
  );

-- ============================================================================
-- TRIGGER - Auto-notify brand when content is submitted
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_brand_of_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_story_creator TEXT;
  v_story_title TEXT;
  v_story_post_type TEXT;
  v_contributor_name TEXT;
  v_is_brand_post BOOLEAN;
BEGIN
  -- Get story details
  SELECT 
    s.creator_id, 
    s.title, 
    s.post_type,
    CASE WHEN s.post_type IN ('canon', 'seed') THEN TRUE ELSE FALSE END
  INTO 
    v_story_creator, 
    v_story_title, 
    v_story_post_type,
    v_is_brand_post
  FROM stories s
  WHERE s.id = NEW.story_id;

  -- Only notify if this is a brand post and status is pending
  IF v_is_brand_post AND NEW.approval_status = 'pending' THEN
    -- Get contributor name
    SELECT name INTO v_contributor_name
    FROM profiles
    WHERE user_id = NEW.user_id;

    -- Insert notification for brand owner
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      action_url,
      read
    ) VALUES (
      v_story_creator,
      'content_submitted_for_review',
      'New Submission to Review',
      v_contributor_name || ' submitted content to "' || v_story_title || '"',
      jsonb_build_object(
        'story_id', NEW.story_id,
        'contribution_id', NEW.id,
        'contributor_id', NEW.user_id,
        'contributor_name', v_contributor_name
      ),
      '/story/' || NEW.story_id,
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on contributions insert
DROP TRIGGER IF EXISTS notify_brand_of_submission_trigger ON contributions;
CREATE TRIGGER notify_brand_of_submission_trigger
  AFTER INSERT ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION notify_brand_of_submission();

-- ============================================================================
-- HELPER FUNCTION - Check if contribution needs approval
-- ============================================================================

CREATE OR REPLACE FUNCTION contribution_needs_approval(p_story_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_post_type TEXT;
BEGIN
  SELECT post_type INTO v_post_type
  FROM stories
  WHERE id = p_story_id;
  
  -- Brand posts (canon and seed) require approval
  RETURN v_post_type IN ('canon', 'seed');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BACKFILL - Set existing contributions as approved
-- ============================================================================

-- Update all existing contributions to 'approved' status (backward compatibility)
UPDATE contributions
SET approval_status = 'approved'
WHERE approval_status IS NULL;

-- Update all existing stories to 'approved' status (backward compatibility)
UPDATE stories
SET approval_status = 'approved'
WHERE approval_status IS NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN contributions.approval_status IS 'Approval status for brand posts: pending, approved, or rejected';
COMMENT ON COLUMN contributions.reviewed_at IS 'Timestamp when content was reviewed by brand';
COMMENT ON COLUMN contributions.reviewed_by IS 'User ID of brand member who reviewed the content';

COMMENT ON COLUMN stories.approval_status IS 'Approval status for Canon posts (story-level approval)';
COMMENT ON COLUMN stories.reviewed_at IS 'Timestamp when story was reviewed by brand';
COMMENT ON COLUMN stories.reviewed_by IS 'User ID of brand member who reviewed the story';

COMMENT ON FUNCTION contribution_needs_approval(UUID) IS 'Returns true if contributions to this story require brand approval';
COMMENT ON FUNCTION notify_brand_of_submission() IS 'Trigger function to notify brand owners when new content is submitted for review';
