-- Security Advisor Fixes Migration
-- Fixes 7 security warnings from Supabase Security Advisor
-- 1. Security Definer Views (2): verification_progress, monetization_eligibility_progress
-- 2. RLS Disabled Tables (5): transactions, brand_pricing, group_roles, member_roles, hashtags

-- ============================================================================
-- 1. FIX SECURITY DEFINER VIEWS
-- Recreate views with SECURITY INVOKER to use caller's permissions
-- ============================================================================

-- Drop and recreate verification_progress view with SECURITY INVOKER
DROP VIEW IF EXISTS verification_progress;

CREATE VIEW verification_progress
WITH (security_invoker = true)
AS
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

-- Re-grant access to the view
GRANT SELECT ON verification_progress TO authenticated;

COMMENT ON VIEW verification_progress IS 'User-friendly view showing verification progress and eligibility (SECURITY INVOKER)';

-- Drop and recreate monetization_eligibility_progress view with SECURITY INVOKER
DROP VIEW IF EXISTS monetization_eligibility_progress;

CREATE VIEW monetization_eligibility_progress
WITH (security_invoker = true)
AS
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

-- Re-grant access to the view
GRANT SELECT ON monetization_eligibility_progress TO authenticated;

COMMENT ON VIEW monetization_eligibility_progress IS 'Shows user progress toward monetization eligibility (SECURITY INVOKER)';

-- ============================================================================
-- 2. ENABLE RLS ON TABLES AND CREATE POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2a. TRANSACTIONS TABLE
-- This table exists separately from token_transactions
-- ----------------------------------------------------------------------------

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view transactions (adjust based on actual schema)
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON transactions;
CREATE POLICY "Authenticated users can view transactions" ON transactions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can manage transactions
DROP POLICY IF EXISTS "Service role can manage transactions" ON transactions;
CREATE POLICY "Service role can manage transactions" ON transactions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- 2b. BRAND_PRICING TABLE
-- Public read access (lookup table), admin-only write
-- ----------------------------------------------------------------------------

ALTER TABLE brand_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view brand pricing" ON brand_pricing;
CREATE POLICY "Anyone can view brand pricing" ON brand_pricing
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage brand pricing" ON brand_pricing;
CREATE POLICY "Service role can manage brand pricing" ON brand_pricing
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- 2c. GROUP_ROLES TABLE
-- Users can view roles for groups they're members of; admins can manage
-- ----------------------------------------------------------------------------

ALTER TABLE group_roles ENABLE ROW LEVEL SECURITY;

-- Anyone can view group roles (needed to display badges/roles in UI)
DROP POLICY IF EXISTS "Anyone can view group roles" ON group_roles;
CREATE POLICY "Anyone can view group roles" ON group_roles
  FOR SELECT
  USING (true);

-- Group admins can create roles
DROP POLICY IF EXISTS "Group admins can create roles" ON group_roles;
CREATE POLICY "Group admins can create roles" ON group_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_roles.group_id
        AND group_members.user_id = auth.uid()::text
        AND group_members.role = 'admin'
    )
  );

-- Group admins can update roles
DROP POLICY IF EXISTS "Group admins can update roles" ON group_roles;
CREATE POLICY "Group admins can update roles" ON group_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_roles.group_id
        AND group_members.user_id = auth.uid()::text
        AND group_members.role = 'admin'
    )
  );

-- Group admins can delete roles
DROP POLICY IF EXISTS "Group admins can delete roles" ON group_roles;
CREATE POLICY "Group admins can delete roles" ON group_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_roles.group_id
        AND group_members.user_id = auth.uid()::text
        AND group_members.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- 2d. MEMBER_ROLES TABLE
-- Users can view member roles for groups they're in; admins can manage
-- ----------------------------------------------------------------------------

ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;

-- Anyone can view member roles (needed to display badges in UI)
DROP POLICY IF EXISTS "Anyone can view member roles" ON member_roles;
CREATE POLICY "Anyone can view member roles" ON member_roles
  FOR SELECT
  USING (true);

-- Group admins can assign roles
DROP POLICY IF EXISTS "Group admins can assign roles" ON member_roles;
CREATE POLICY "Group admins can assign roles" ON member_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = member_roles.group_id
        AND group_members.user_id = auth.uid()::text
        AND group_members.role = 'admin'
    )
  );

-- Group admins can update role assignments
DROP POLICY IF EXISTS "Group admins can update role assignments" ON member_roles;
CREATE POLICY "Group admins can update role assignments" ON member_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = member_roles.group_id
        AND group_members.user_id = auth.uid()::text
        AND group_members.role = 'admin'
    )
  );

-- Group admins can remove role assignments
DROP POLICY IF EXISTS "Group admins can remove role assignments" ON member_roles;
CREATE POLICY "Group admins can remove role assignments" ON member_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = member_roles.group_id
        AND group_members.user_id = auth.uid()::text
        AND group_members.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- 2e. HASHTAGS TABLE
-- Public read access (shared resource), system-managed write via trigger
-- ----------------------------------------------------------------------------

ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view hashtags" ON hashtags;
CREATE POLICY "Anyone can view hashtags" ON hashtags
  FOR SELECT
  USING (true);

-- Hashtags are managed by trigger function (sync_hashtags), which runs as SECURITY DEFINER
-- No direct user writes should be allowed
DROP POLICY IF EXISTS "Service role can manage hashtags" ON hashtags;
CREATE POLICY "Service role can manage hashtags" ON hashtags
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Allow the trigger function to manage hashtags (it runs as security definer)
DROP POLICY IF EXISTS "Trigger can manage hashtags" ON hashtags;
CREATE POLICY "Trigger can manage hashtags" ON hashtags
  FOR ALL
  USING (current_setting('request.jwt.claims', true) IS NULL);

-- ============================================================================
-- DONE
-- ============================================================================
