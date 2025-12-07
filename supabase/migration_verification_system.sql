-- Weeve Verification System Migration
-- This adds a blue tick verification system based on user achievements and engagement

-- Add verification fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_tier TEXT CHECK (verification_tier IN ('bronze', 'silver', 'gold')) DEFAULT 'bronze';

-- Create verification_criteria table to track user progress
CREATE TABLE IF NOT EXISTS verification_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  -- Content creation criteria
  total_stories_created INTEGER DEFAULT 0,
  total_contributions INTEGER DEFAULT 0,
  total_views_received INTEGER DEFAULT 0,
  total_engagement_score INTEGER DEFAULT 0, -- likes + comments combined
  days_active INTEGER DEFAULT 0,
  
  -- Community building criteria
  groups_created INTEGER DEFAULT 0,
  groups_moderated INTEGER DEFAULT 0,
  total_followers INTEGER DEFAULT 0,
  total_following INTEGER DEFAULT 0,
  engagement_ratio DECIMAL(5,2) DEFAULT 0, -- positive engagement vs reports
  
  -- Platform investment criteria
  account_age_days INTEGER DEFAULT 0,
  profile_complete BOOLEAN DEFAULT FALSE,
  tokens_earned INTEGER DEFAULT 0,
  tokens_spent INTEGER DEFAULT 0,
  
  -- Trust signals
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  violations_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create verification_requirements table (configurable thresholds)
CREATE TABLE IF NOT EXISTS verification_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  
  -- Content creation requirements
  min_stories_created INTEGER DEFAULT 5,
  min_contributions INTEGER DEFAULT 10,
  min_views_received INTEGER DEFAULT 100,
  min_engagement_score INTEGER DEFAULT 50,
  min_days_active INTEGER DEFAULT 30,
  
  -- Community building requirements
  min_groups_created INTEGER DEFAULT 0,
  min_groups_moderated INTEGER DEFAULT 0,
  min_followers INTEGER DEFAULT 10,
  min_engagement_ratio DECIMAL(5,2) DEFAULT 0.8,
  
  -- Platform investment requirements
  min_account_age_days INTEGER DEFAULT 30,
  require_profile_complete BOOLEAN DEFAULT TRUE,
  min_tokens_earned INTEGER DEFAULT 50,
  min_tokens_spent INTEGER DEFAULT 20,
  
  -- Trust signal requirements
  require_email_verified BOOLEAN DEFAULT TRUE,
  require_phone_verified BOOLEAN DEFAULT FALSE,
  max_violations INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tier)
);

-- Insert default requirements for each tier
INSERT INTO verification_requirements (
  tier,
  min_stories_created,
  min_contributions,
  min_views_received,
  min_engagement_score,
  min_days_active,
  min_groups_created,
  min_followers,
  min_engagement_ratio,
  min_account_age_days,
  require_profile_complete,
  min_tokens_earned,
  min_tokens_spent,
  require_email_verified,
  require_phone_verified,
  max_violations
) VALUES 
  -- Bronze tier (easy - entry level)
  ('bronze', 3, 5, 50, 20, 14, 0, 5, 0.75, 14, TRUE, 25, 10, TRUE, FALSE, 0),
  -- Silver tier (medium - active contributor)
  ('silver', 10, 20, 500, 100, 30, 1, 25, 0.80, 30, TRUE, 100, 50, TRUE, FALSE, 0),
  -- Gold tier (hard - community leader)
  ('gold', 25, 50, 2000, 500, 60, 2, 100, 0.85, 60, TRUE, 500, 200, TRUE, TRUE, 0)
ON CONFLICT (tier) DO NOTHING;

-- Create verification_audit_log to track verification changes
CREATE TABLE IF NOT EXISTS verification_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('granted', 'revoked', 'upgraded', 'downgraded')),
  previous_tier TEXT,
  new_tier TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to calculate engagement ratio
CREATE OR REPLACE FUNCTION calculate_engagement_ratio(p_user_id TEXT)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  positive_count INTEGER;
  negative_count INTEGER;
  ratio DECIMAL(5,2);
BEGIN
  -- Count positive engagements (likes + comments on user's stories)
  SELECT COALESCE(
    (SELECT COUNT(*) FROM story_likes sl
     JOIN stories s ON sl.story_id = s.id
     WHERE s.creator_id = p_user_id)
    +
    (SELECT COUNT(*) FROM story_comments sc
     JOIN stories s ON sc.story_id = s.id
     WHERE s.creator_id = p_user_id),
    0
  ) INTO positive_count;
  
  -- Count negative engagements (assuming we'll add reports later)
  negative_count := 0;
  
  IF (positive_count + negative_count) = 0 THEN
    RETURN 1.0;
  END IF;
  
  ratio := positive_count::DECIMAL / (positive_count + negative_count);
  RETURN LEAST(ratio, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Function to update verification criteria for a user
CREATE OR REPLACE FUNCTION update_verification_criteria(p_user_id TEXT)
RETURNS void AS $$
DECLARE
  v_stories_created INTEGER;
  v_contributions INTEGER;
  v_views_received INTEGER;
  v_engagement_score INTEGER;
  v_groups_created INTEGER;
  v_followers INTEGER;
  v_following INTEGER;
  v_engagement_ratio DECIMAL(5,2);
  v_account_age_days INTEGER;
  v_profile_complete BOOLEAN;
  v_tokens INTEGER;
  v_days_active INTEGER;
BEGIN
  -- Calculate content creation metrics
  SELECT COUNT(*) INTO v_stories_created
  FROM stories WHERE creator_id = p_user_id;
  
  SELECT COUNT(*) INTO v_contributions
  FROM contributions WHERE user_id = p_user_id;
  
  SELECT COALESCE(SUM(view_count), 0) INTO v_views_received
  FROM stories WHERE creator_id = p_user_id;
  
  -- Calculate engagement score (likes + comments on user's content)
  SELECT COALESCE(
    (SELECT COUNT(*) FROM story_likes sl
     JOIN stories s ON sl.story_id = s.id
     WHERE s.creator_id = p_user_id)
    +
    (SELECT COUNT(*) FROM story_comments sc
     JOIN stories s ON sc.story_id = s.id
     WHERE s.creator_id = p_user_id),
    0
  ) INTO v_engagement_score;
  
  -- Calculate community metrics
  SELECT COUNT(*) INTO v_groups_created
  FROM groups WHERE creator_id = p_user_id;
  
  SELECT COUNT(*) INTO v_followers
  FROM followers WHERE following_id = p_user_id;
  
  SELECT COUNT(*) INTO v_following
  FROM followers WHERE follower_id = p_user_id;
  
  -- Calculate engagement ratio
  v_engagement_ratio := calculate_engagement_ratio(p_user_id);
  
  -- Calculate account age
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_account_age_days
  FROM profiles WHERE user_id = p_user_id;
  
  -- Check if profile is complete (has name and avatar)
  SELECT (name IS NOT NULL AND name != '' AND avatar IS NOT NULL) INTO v_profile_complete
  FROM profiles WHERE user_id = p_user_id;
  
  -- Get current tokens
  SELECT tokens INTO v_tokens
  FROM profiles WHERE user_id = p_user_id;
  
  -- Calculate days active (distinct days with contributions or stories)
  SELECT COUNT(DISTINCT DATE(created_at)) INTO v_days_active
  FROM (
    SELECT created_at FROM contributions WHERE user_id = p_user_id
    UNION ALL
    SELECT created_at FROM stories WHERE creator_id = p_user_id
  ) AS activity;
  
  -- Insert or update verification criteria
  INSERT INTO verification_criteria (
    user_id,
    total_stories_created,
    total_contributions,
    total_views_received,
    total_engagement_score,
    days_active,
    groups_created,
    total_followers,
    total_following,
    engagement_ratio,
    account_age_days,
    profile_complete,
    tokens_earned,
    updated_at
  ) VALUES (
    p_user_id,
    v_stories_created,
    v_contributions,
    v_views_received,
    v_engagement_score,
    v_days_active,
    v_groups_created,
    v_followers,
    v_following,
    v_engagement_ratio,
    v_account_age_days,
    v_profile_complete,
    v_tokens,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_stories_created = EXCLUDED.total_stories_created,
    total_contributions = EXCLUDED.total_contributions,
    total_views_received = EXCLUDED.total_views_received,
    total_engagement_score = EXCLUDED.total_engagement_score,
    days_active = EXCLUDED.days_active,
    groups_created = EXCLUDED.groups_created,
    total_followers = EXCLUDED.total_followers,
    total_following = EXCLUDED.total_following,
    engagement_ratio = EXCLUDED.engagement_ratio,
    account_age_days = EXCLUDED.account_age_days,
    profile_complete = EXCLUDED.profile_complete,
    tokens_earned = EXCLUDED.tokens_earned,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check if user meets verification requirements for a tier
CREATE OR REPLACE FUNCTION check_verification_eligibility(
  p_user_id TEXT,
  p_tier TEXT DEFAULT 'bronze'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_criteria verification_criteria%ROWTYPE;
  v_requirements verification_requirements%ROWTYPE;
BEGIN
  -- Get user criteria
  SELECT * INTO v_criteria
  FROM verification_criteria
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get tier requirements
  SELECT * INTO v_requirements
  FROM verification_requirements
  WHERE tier = p_tier;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check all requirements
  RETURN (
    v_criteria.total_stories_created >= v_requirements.min_stories_created AND
    v_criteria.total_contributions >= v_requirements.min_contributions AND
    v_criteria.total_views_received >= v_requirements.min_views_received AND
    v_criteria.total_engagement_score >= v_requirements.min_engagement_score AND
    v_criteria.days_active >= v_requirements.min_days_active AND
    v_criteria.groups_created >= v_requirements.min_groups_created AND
    v_criteria.total_followers >= v_requirements.min_followers AND
    v_criteria.engagement_ratio >= v_requirements.min_engagement_ratio AND
    v_criteria.account_age_days >= v_requirements.min_account_age_days AND
    (NOT v_requirements.require_profile_complete OR v_criteria.profile_complete) AND
    v_criteria.tokens_earned >= v_requirements.min_tokens_earned AND
    v_criteria.tokens_spent >= v_requirements.min_tokens_spent AND
    (NOT v_requirements.require_email_verified OR v_criteria.email_verified) AND
    (NOT v_requirements.require_phone_verified OR v_criteria.phone_verified) AND
    v_criteria.violations_count <= v_requirements.max_violations
  );
END;
$$ LANGUAGE plpgsql;

-- Function to auto-grant verification based on criteria
CREATE OR REPLACE FUNCTION auto_grant_verification(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_current_tier TEXT;
  v_new_tier TEXT;
  v_is_verified BOOLEAN;
BEGIN
  -- Get current verification status
  SELECT is_verified, verification_tier INTO v_is_verified, v_current_tier
  FROM profiles WHERE user_id = p_user_id;
  
  -- Update criteria first
  PERFORM update_verification_criteria(p_user_id);
  
  -- Check eligibility for each tier (highest to lowest)
  IF check_verification_eligibility(p_user_id, 'gold') THEN
    v_new_tier := 'gold';
  ELSIF check_verification_eligibility(p_user_id, 'silver') THEN
    v_new_tier := 'silver';
  ELSIF check_verification_eligibility(p_user_id, 'bronze') THEN
    v_new_tier := 'bronze';
  ELSE
    -- Not eligible for any tier
    IF v_is_verified THEN
      -- Revoke verification
      UPDATE profiles
      SET is_verified = FALSE,
          verification_tier = NULL,
          verified_at = NULL
      WHERE user_id = p_user_id;
      
      INSERT INTO verification_audit_log (user_id, action, previous_tier, reason)
      VALUES (p_user_id, 'revoked', v_current_tier, 'No longer meets minimum criteria');
      
      RETURN 'revoked';
    END IF;
    RETURN 'not_eligible';
  END IF;
  
  -- Grant or update verification
  IF NOT v_is_verified THEN
    -- First time verification
    UPDATE profiles
    SET is_verified = TRUE,
        verification_tier = v_new_tier,
        verified_at = NOW()
    WHERE user_id = p_user_id;
    
    INSERT INTO verification_audit_log (user_id, action, new_tier, reason)
    VALUES (p_user_id, 'granted', v_new_tier, 'Met all criteria for ' || v_new_tier || ' tier');
    
    RETURN 'granted_' || v_new_tier;
  ELSIF v_current_tier != v_new_tier THEN
    -- Tier changed
    UPDATE profiles
    SET verification_tier = v_new_tier,
        verified_at = NOW()
    WHERE user_id = p_user_id;
    
    INSERT INTO verification_audit_log (user_id, action, previous_tier, new_tier, reason)
    VALUES (
      p_user_id,
      CASE WHEN v_new_tier > v_current_tier THEN 'upgraded' ELSE 'downgraded' END,
      v_current_tier,
      v_new_tier,
      'Criteria updated'
    );
    
    RETURN CASE WHEN v_new_tier > v_current_tier THEN 'upgraded_' ELSE 'downgraded_' END || v_new_tier;
  END IF;
  
  RETURN 'unchanged';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verification_criteria_user_id ON verification_criteria(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_tier ON profiles(verification_tier);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_user_id ON verification_audit_log(user_id);

-- Enable RLS on new tables
ALTER TABLE verification_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_criteria
CREATE POLICY "Users can view their own verification criteria"
  ON verification_criteria FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Service role can manage verification criteria"
  ON verification_criteria FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- RLS Policies for verification_requirements (public read)
CREATE POLICY "Anyone can view verification requirements"
  ON verification_requirements FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage requirements"
  ON verification_requirements FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- RLS Policies for verification_audit_log
CREATE POLICY "Users can view their own verification audit log"
  ON verification_audit_log FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Service role can manage audit log"
  ON verification_audit_log FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Create a view for easy verification progress checking
CREATE OR REPLACE VIEW verification_progress AS
SELECT 
  vc.user_id,
  p.name,
  p.is_verified,
  p.verification_tier,
  p.verified_at,
  
  -- Bronze tier progress (as percentages)
  LEAST(100, ROUND((vc.total_stories_created::DECIMAL / NULLIF(vr_bronze.min_stories_created, 0)) * 100)) as bronze_stories_pct,
  LEAST(100, ROUND((vc.total_contributions::DECIMAL / NULLIF(vr_bronze.min_contributions, 0)) * 100)) as bronze_contributions_pct,
  LEAST(100, ROUND((vc.total_views_received::DECIMAL / NULLIF(vr_bronze.min_views_received, 0)) * 100)) as bronze_views_pct,
  LEAST(100, ROUND((vc.total_engagement_score::DECIMAL / NULLIF(vr_bronze.min_engagement_score, 0)) * 100)) as bronze_engagement_pct,
  LEAST(100, ROUND((vc.days_active::DECIMAL / NULLIF(vr_bronze.min_days_active, 0)) * 100)) as bronze_active_days_pct,
  LEAST(100, ROUND((vc.total_followers::DECIMAL / NULLIF(vr_bronze.min_followers, 0)) * 100)) as bronze_followers_pct,
  LEAST(100, ROUND((vc.account_age_days::DECIMAL / NULLIF(vr_bronze.min_account_age_days, 0)) * 100)) as bronze_account_age_pct,
  
  -- Current values
  vc.total_stories_created,
  vc.total_contributions,
  vc.total_views_received,
  vc.total_engagement_score,
  vc.days_active,
  vc.total_followers,
  vc.engagement_ratio,
  vc.account_age_days,
  vc.profile_complete,
  vc.tokens_earned,
  vc.tokens_spent,
  vc.email_verified,
  vc.phone_verified,
  
  -- Requirements for bronze
  vr_bronze.min_stories_created as bronze_req_stories,
  vr_bronze.min_contributions as bronze_req_contributions,
  vr_bronze.min_views_received as bronze_req_views,
  vr_bronze.min_engagement_score as bronze_req_engagement,
  vr_bronze.min_days_active as bronze_req_active_days,
  vr_bronze.min_followers as bronze_req_followers,
  
  -- Eligibility
  check_verification_eligibility(vc.user_id, 'bronze') as eligible_bronze,
  check_verification_eligibility(vc.user_id, 'silver') as eligible_silver,
  check_verification_eligibility(vc.user_id, 'gold') as eligible_gold
  
FROM verification_criteria vc
JOIN profiles p ON vc.user_id = p.user_id
CROSS JOIN verification_requirements vr_bronze
WHERE vr_bronze.tier = 'bronze';

-- Grant access to the view
GRANT SELECT ON verification_progress TO authenticated;

COMMENT ON TABLE profiles IS 'User profiles with verification status';
COMMENT ON TABLE verification_criteria IS 'Tracks user progress toward verification requirements';
COMMENT ON TABLE verification_requirements IS 'Configurable thresholds for each verification tier';
COMMENT ON TABLE verification_audit_log IS 'Audit trail of all verification status changes';
COMMENT ON VIEW verification_progress IS 'User-friendly view showing verification progress and eligibility';
