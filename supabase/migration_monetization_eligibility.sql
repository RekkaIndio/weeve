-- Monetization Eligibility Extension
-- This adds criteria for users to be eligible to charge for their content
-- Separate from verification - lower barrier to entry

-- Add monetization eligibility fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS can_monetize_stories BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS monetization_enabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS monetization_restrictions TEXT; -- Reason if restricted

-- Create monetization_requirements table (separate from verification)
CREATE TABLE IF NOT EXISTS monetization_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('story', 'group', 'event')),
  
  -- Basic requirements
  min_account_age_days INTEGER DEFAULT 3,
  min_stories_created INTEGER DEFAULT 2,
  min_contributions INTEGER DEFAULT 0,
  min_tokens_earned INTEGER DEFAULT 10,
  
  -- Trust requirements
  require_email_verified BOOLEAN DEFAULT TRUE,
  require_profile_complete BOOLEAN DEFAULT TRUE,
  max_violations INTEGER DEFAULT 0,
  
  -- Optional community requirements
  min_followers INTEGER DEFAULT 0,
  min_engagement_score INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(requirement_type)
);

-- Insert default monetization requirements
INSERT INTO monetization_requirements (
  requirement_type,
  min_account_age_days,
  min_stories_created,
  min_contributions,
  min_tokens_earned,
  require_email_verified,
  require_profile_complete,
  max_violations,
  min_followers,
  min_engagement_score
) VALUES 
  -- Story monetization (low barrier)
  ('story', 3, 2, 0, 10, TRUE, TRUE, 0, 0, 0),
  -- Group monetization (immediate - groups are higher commitment)
  ('group', 0, 0, 0, 0, TRUE, TRUE, 0, 0, 0),
  -- Event monetization (future use)
  ('event', 7, 5, 5, 50, TRUE, TRUE, 0, 5, 10)
ON CONFLICT (requirement_type) DO NOTHING;

-- Function to check if user can monetize content
CREATE OR REPLACE FUNCTION check_monetization_eligibility(
  p_user_id TEXT,
  p_requirement_type TEXT DEFAULT 'story'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_criteria verification_criteria%ROWTYPE;
  v_requirements monetization_requirements%ROWTYPE;
  v_has_restrictions BOOLEAN;
BEGIN
  -- Check if user has monetization restrictions
  SELECT (monetization_restrictions IS NOT NULL) INTO v_has_restrictions
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF v_has_restrictions THEN
    RETURN FALSE;
  END IF;
  
  -- Get user criteria (reuse verification_criteria table)
  SELECT * INTO v_criteria
  FROM verification_criteria
  WHERE user_id = p_user_id;
  
  -- If no criteria exists yet, create it
  IF NOT FOUND THEN
    PERFORM update_verification_criteria(p_user_id);
    SELECT * INTO v_criteria
    FROM verification_criteria
    WHERE user_id = p_user_id;
  END IF;
  
  -- Get monetization requirements
  SELECT * INTO v_requirements
  FROM monetization_requirements
  WHERE requirement_type = p_requirement_type;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check all requirements
  RETURN (
    v_criteria.account_age_days >= v_requirements.min_account_age_days AND
    v_criteria.total_stories_created >= v_requirements.min_stories_created AND
    v_criteria.total_contributions >= v_requirements.min_contributions AND
    v_criteria.tokens_earned >= v_requirements.min_tokens_earned AND
    (NOT v_requirements.require_email_verified OR v_criteria.email_verified) AND
    (NOT v_requirements.require_profile_complete OR v_criteria.profile_complete) AND
    v_criteria.violations_count <= v_requirements.max_violations AND
    v_criteria.total_followers >= v_requirements.min_followers AND
    v_criteria.total_engagement_score >= v_requirements.min_engagement_score
  );
END;
$$ LANGUAGE plpgsql;

-- Function to enable/disable monetization for a user
CREATE OR REPLACE FUNCTION update_monetization_eligibility(p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_can_monetize BOOLEAN;
  v_current_status BOOLEAN;
BEGIN
  -- Get current status
  SELECT can_monetize_stories INTO v_current_status
  FROM profiles
  WHERE user_id = p_user_id;
  
  -- Check if eligible
  v_can_monetize := check_monetization_eligibility(p_user_id, 'story');
  
  -- Update if status changed
  IF v_can_monetize != COALESCE(v_current_status, FALSE) THEN
    UPDATE profiles
    SET 
      can_monetize_stories = v_can_monetize,
      monetization_enabled_at = CASE 
        WHEN v_can_monetize AND NOT COALESCE(v_current_status, FALSE) THEN NOW()
        ELSE monetization_enabled_at
      END
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_can_monetize;
END;
$$ LANGUAGE plpgsql;

-- Function to restrict monetization (admin/moderation use)
CREATE OR REPLACE FUNCTION restrict_monetization(
  p_user_id TEXT,
  p_reason TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    can_monetize_stories = FALSE,
    monetization_restrictions = p_reason
  WHERE user_id = p_user_id;
  
  -- Also set monetization_cost to 0 on all their stories
  UPDATE stories
  SET monetization_cost = NULL
  WHERE creator_id = p_user_id AND monetization_cost > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to lift monetization restrictions
CREATE OR REPLACE FUNCTION lift_monetization_restriction(p_user_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET monetization_restrictions = NULL
  WHERE user_id = p_user_id;
  
  -- Re-check eligibility
  PERFORM update_monetization_eligibility(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Trigger to check monetization eligibility before setting story price
CREATE OR REPLACE FUNCTION check_story_monetization()
RETURNS TRIGGER AS $$
DECLARE
  v_can_monetize BOOLEAN;
  v_is_group_story BOOLEAN;
BEGIN
  -- If no monetization cost, allow
  IF NEW.monetization_cost IS NULL OR NEW.monetization_cost = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Check if this is a group story (groups can always monetize)
  v_is_group_story := (NEW.group_id IS NOT NULL);
  
  IF v_is_group_story THEN
    -- Groups can monetize immediately
    RETURN NEW;
  END IF;
  
  -- Check individual monetization eligibility
  SELECT check_monetization_eligibility(NEW.creator_id, 'story') INTO v_can_monetize;
  
  IF NOT v_can_monetize THEN
    RAISE EXCEPTION 'User not eligible to monetize stories yet. Complete profile, create 2 public stories, and earn 10 tokens first.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for story monetization checks
DROP TRIGGER IF EXISTS check_story_monetization_trigger ON stories;
CREATE TRIGGER check_story_monetization_trigger
  BEFORE INSERT OR UPDATE OF monetization_cost
  ON stories
  FOR EACH ROW
  EXECUTE FUNCTION check_story_monetization();

-- Create index for monetization queries
CREATE INDEX IF NOT EXISTS idx_profiles_can_monetize ON profiles(can_monetize_stories);

-- Enable RLS on monetization_requirements
ALTER TABLE monetization_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policy for monetization_requirements (public read)
CREATE POLICY "Anyone can view monetization requirements"
  ON monetization_requirements FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage monetization requirements"
  ON monetization_requirements FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Create view for monetization eligibility progress
CREATE OR REPLACE VIEW monetization_eligibility_progress AS
SELECT 
  vc.user_id,
  p.name,
  p.can_monetize_stories,
  p.monetization_enabled_at,
  p.monetization_restrictions,
  
  -- Progress toward story monetization (as percentages)
  LEAST(100, ROUND((vc.account_age_days::DECIMAL / NULLIF(mr.min_account_age_days, 0)) * 100)) as account_age_pct,
  LEAST(100, ROUND((vc.total_stories_created::DECIMAL / NULLIF(mr.min_stories_created, 0)) * 100)) as stories_pct,
  LEAST(100, ROUND((vc.tokens_earned::DECIMAL / NULLIF(mr.min_tokens_earned, 0)) * 100)) as tokens_pct,
  
  -- Current values
  vc.account_age_days,
  vc.total_stories_created,
  vc.tokens_earned,
  vc.profile_complete,
  vc.email_verified,
  vc.violations_count,
  
  -- Requirements
  mr.min_account_age_days,
  mr.min_stories_created,
  mr.min_tokens_earned,
  
  -- Eligibility check
  check_monetization_eligibility(vc.user_id, 'story') as eligible_to_monetize,
  
  -- Check if all requirements met
  CASE 
    WHEN vc.account_age_days >= mr.min_account_age_days
      AND vc.total_stories_created >= mr.min_stories_created
      AND vc.tokens_earned >= mr.min_tokens_earned
      AND vc.profile_complete
      AND vc.email_verified
      AND vc.violations_count = 0
    THEN 'All requirements met!'
    ELSE 'Keep creating to unlock monetization'
  END as status_message
  
FROM verification_criteria vc
JOIN profiles p ON vc.user_id = p.user_id
CROSS JOIN monetization_requirements mr
WHERE mr.requirement_type = 'story';

-- Grant access to the view
GRANT SELECT ON monetization_eligibility_progress TO authenticated;

-- Add helpful comments
COMMENT ON TABLE monetization_requirements IS 'Requirements for users to enable content monetization';
COMMENT ON COLUMN profiles.can_monetize_stories IS 'Whether user is eligible to charge for individual stories';
COMMENT ON COLUMN profiles.monetization_restrictions IS 'Reason for monetization restriction, if any';
COMMENT ON VIEW monetization_eligibility_progress IS 'Shows user progress toward monetization eligibility';

-- Helper function to get monetization status with detailed reasons
CREATE OR REPLACE FUNCTION get_monetization_status(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'can_monetize', can_monetize_stories,
    'is_restricted', (monetization_restrictions IS NOT NULL),
    'restriction_reason', monetization_restrictions,
    'enabled_at', monetization_enabled_at,
    'progress', (
      SELECT json_build_object(
        'account_age_days', account_age_days,
        'account_age_required', min_account_age_days,
        'account_age_met', account_age_days >= min_account_age_days,
        'stories_created', total_stories_created,
        'stories_required', min_stories_created,
        'stories_met', total_stories_created >= min_stories_created,
        'tokens_earned', tokens_earned,
        'tokens_required', min_tokens_earned,
        'tokens_met', tokens_earned >= min_tokens_earned,
        'profile_complete', profile_complete,
        'email_verified', email_verified,
        'no_violations', violations_count = 0
      )
      FROM monetization_eligibility_progress
      WHERE user_id = p_user_id
    )
  ) INTO v_result
  FROM profiles
  WHERE user_id = p_user_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_monetization_status IS 'Returns detailed monetization eligibility status for a user';
